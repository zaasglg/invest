<?php

use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createWeeklyPhotoUser(
    string $roleName,
    ?Region $region = null,
    array $attributes = []
): User {
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        ['display_name' => ucfirst($roleName)]
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
        'region_id' => $region?->id,
        ...$attributes,
    ]);
}

function createWeeklyPhotoRegion(
    string $name = 'Апталық фото тест ауданы',
    string $subtype = 'district'
): Region {
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'subtype' => $subtype,
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function createWeeklyPhotoProject(
    User $curator,
    Region $region,
    string $name = 'Апталық фото тест жобасы'
): InvestmentProject {
    $project = InvestmentProject::create([
        'name' => $name,
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'implementation',
        'current_status' => 'Іске асырылуда',
        'created_by' => $curator->id,
    ]);
    $project->curators()->syncWithoutDetaching([$curator->id]);

    return $project;
}

function configureWeeklyPhotoTelegram(): void
{
    config()->set('services.telegram.bot_token', 'weekly-photo-test-token');

    Http::preventStrayRequests();
    Http::fake([
        'api.telegram.org/*' => Http::response(['ok' => true], 200),
    ]);
}

test('district executor is automatically attached to projects in the same district or city', function () {
    $district = createWeeklyPhotoRegion();
    $city = createWeeklyPhotoRegion('Апталық фото тест қаласы', 'city');
    $curator = createWeeklyPhotoUser('invest');
    $districtExecutor = createWeeklyPhotoUser('ispolnitel', $district, [
        'baskarma_type' => 'district',
    ]);
    $managementExecutor = createWeeklyPhotoUser('ispolnitel', $district, [
        'baskarma_type' => 'oblast',
    ]);
    $departmentExecutor = createWeeklyPhotoUser('ispolnitel', $district, [
        'baskarma_type' => 'additional',
    ]);

    $districtProject = createWeeklyPhotoProject($curator, $district);
    $cityProject = createWeeklyPhotoProject(
        $curator,
        $city,
        'Қаладағы апталық фото жобасы'
    );
    $cityExecutor = createWeeklyPhotoUser('ispolnitel', $city, [
        'baskarma_type' => 'district',
    ]);

    expect(
        $districtProject->executors()->whereKey($districtExecutor->id)->exists()
    )->toBeTrue()
        ->and(
            $cityProject->executors()->whereKey($cityExecutor->id)->exists()
        )->toBeTrue()
        ->and(
            $districtProject->executors()->whereKey($cityExecutor->id)->exists()
        )->toBeFalse()
        ->and(
            $districtProject->executors()
                ->whereKey($managementExecutor->id)
                ->exists()
        )->toBeFalse()
        ->and(
            $districtProject->executors()
                ->whereKey($departmentExecutor->id)
                ->exists()
        )->toBeFalse();
});

test('project gallery records the user who uploaded each photo', function () {
    Storage::fake('public');

    $region = createWeeklyPhotoRegion();
    $curator = createWeeklyPhotoUser('invest');
    $executor = createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'district',
    ]);
    $project = createWeeklyPhotoProject($curator, $region);

    $this->actingAs($executor)
        ->post(route('investment-projects.gallery.store', $project), [
            'photos' => [UploadedFile::fake()->createWithContent(
                'progress.png',
                base64_decode(
                    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
                    .'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
                )
            )],
            'photo_type' => 'gallery',
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('project_photos', [
        'project_id' => $project->id,
        'uploaded_by' => $executor->id,
        'photo_type' => 'gallery',
    ]);
});

test('weekly check notifies district executors but not other executor types or curators', function () {
    configureWeeklyPhotoTelegram();

    $region = createWeeklyPhotoRegion();
    $curator = createWeeklyPhotoUser('invest', null, [
        'telegram_chat_id' => 'curator-chat',
    ]);
    $executor = createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'district',
        'telegram_chat_id' => 'district-executor-chat',
    ]);
    createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'oblast',
        'telegram_chat_id' => 'management-executor-chat',
    ]);
    createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'additional',
        'telegram_chat_id' => 'department-executor-chat',
    ]);
    $project = createWeeklyPhotoProject($curator, $region);

    ProjectPhoto::create([
        'project_id' => $project->id,
        'file_path' => 'project-photos/other-user.jpg',
        'photo_type' => 'gallery',
        'gallery_date' => now()->toDateString(),
        'uploaded_by' => $curator->id,
    ]);

    expect(Artisan::call('photos:check-weekly'))->toBe(0);

    Http::assertSent(fn (Request $request) => $request['chat_id'] === 'district-executor-chat'
        && str_contains($request['text'], $project->name)
        && str_contains($request['text'], $executor->full_name)
        && str_contains(mb_strtolower($request['text']), 'соңғы 7 күнде')
    );
    Http::assertNotSent(fn (Request $request) => in_array(
        $request['chat_id'],
        [
            'curator-chat',
            'management-executor-chat',
            'department-executor-chat',
        ],
        true
    ));
    Http::assertSentCount(1);
});

test('weekly telegram summary project links open their matching project cards', function () {
    configureWeeklyPhotoTelegram();

    $region = createWeeklyPhotoRegion();
    $curator = createWeeklyPhotoUser('invest');
    $executor = createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'district',
        'telegram_chat_id' => 'district-executor-chat',
    ]);
    $projects = collect([
        createWeeklyPhotoProject($curator, $region, 'Бірінші жоба & жаңа кезең'),
        createWeeklyPhotoProject($curator, $region, 'Екінші жоба <құрылыс>'),
    ])->keyBy('name');
    $origin = rtrim((string) config('app.url'), '/');

    // Run before any web request so console URLs use the configured APP_URL.
    expect(Artisan::call('photos:check-weekly'))->toBe(0);
    Http::assertSentCount(1);

    $sentRequest = Http::recorded()->sole()[0];
    expect($sentRequest['chat_id'])->toBe($executor->telegram_chat_id)
        ->and($sentRequest['parse_mode'])->toBe('HTML');

    preg_match_all(
        '/<a href="([^"]+)">(.*?)<\/a>/us',
        $sentRequest['text'],
        $anchors,
        PREG_SET_ORDER
    );
    expect($anchors)->toHaveCount(3);

    $footer = array_pop($anchors);
    $footerUrl = html_entity_decode($footer[1], ENT_QUOTES, 'UTF-8');

    expect($footer[2])->toBe('Сайтқа өту')
        ->and($footerUrl)->toBe($origin.'/notifications');

    $this->actingAs($executor);
    $visitedProjectIds = [];

    foreach ($anchors as $anchor) {
        $projectName = html_entity_decode(strip_tags($anchor[2]), ENT_QUOTES, 'UTF-8');
        $project = $projects->get($projectName);
        $projectUrl = html_entity_decode($anchor[1], ENT_QUOTES, 'UTF-8');

        expect($project)->not->toBeNull();
        expect($projectUrl)->toBe($origin.'/investment-projects/'.$project->id)
            ->not->toBe($footerUrl);

        $this->get($projectUrl)
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('investment-projects/show')
                ->where('project.id', $project->id)
                ->where('project.name', $project->name)
            );
        $visitedProjectIds[] = $project->id;
    }

    expect($visitedProjectIds)->toEqualCanonicalizing($projects->pluck('id')->all());

    $this->get($footerUrl)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications/index')
        );
});

test('weekly check does not notify when the same district executor uploaded a recent gallery photo', function () {
    configureWeeklyPhotoTelegram();

    $region = createWeeklyPhotoRegion();
    $curator = createWeeklyPhotoUser('invest', null, [
        'telegram_chat_id' => 'curator-chat',
    ]);
    $executor = createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'district',
        'telegram_chat_id' => 'district-executor-chat',
    ]);
    $project = createWeeklyPhotoProject($curator, $region);

    ProjectPhoto::create([
        'project_id' => $project->id,
        'file_path' => 'project-photos/executor.jpg',
        'photo_type' => 'gallery',
        'gallery_date' => now()->toDateString(),
        'uploaded_by' => $executor->id,
    ]);

    expect(Artisan::call('photos:check-weekly'))->toBe(0);

    Http::assertNothingSent();
});

test('sync command repairs missing automatic executor assignments', function () {
    $region = createWeeklyPhotoRegion();
    $curator = createWeeklyPhotoUser('invest');
    $executor = createWeeklyPhotoUser('ispolnitel', $region, [
        'baskarma_type' => 'district',
    ]);
    $project = createWeeklyPhotoProject($curator, $region);

    $project->executors()->detach($executor->id);

    expect(Artisan::call('projects:sync-district-executors'))->toBe(0)
        ->and(
            $project->executors()->whereKey($executor->id)->exists()
        )->toBeTrue();
});
