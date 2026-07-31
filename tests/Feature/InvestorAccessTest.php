<?php

use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectIssue;
use App\Models\ProjectPhoto;
use App\Models\ProjectTask;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function createInvestorTestRole(string $name, string $displayName): Role
{
    return Role::firstOrCreate(
        ['name' => $name],
        [
            'display_name' => $displayName,
            'description' => "{$displayName} test role",
        ]
    );
}

function createInvestorTestUser(string $roleName): User
{
    $role = createInvestorTestRole(
        $roleName,
        $roleName === 'investor' ? 'Инвестор' : ucfirst($roleName)
    );

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function createInvestorTestRegion(string $name = 'Инвестор тест ауданы'): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

/**
 * @return array{company: Company, investor: User}
 */
function createInvestorTestCompany(
    User $creator,
    Region $region,
    string $name
): array {
    $company = Company::factory()->create([
        'name' => $name,
        'region_id' => $region->id,
        'created_by' => $creator->id,
    ]);
    $investor = createInvestorTestUser('investor');
    $investor->update(['company_id' => $company->id]);

    return compact('company', 'investor');
}

function createInvestorTestProject(
    User $creator,
    Company $company,
    Region $region,
    string $name,
    float $investment
): InvestmentProject {
    return InvestmentProject::create([
        'name' => $name,
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => $investment,
        'status' => 'implementation',
        'current_status' => 'Іске асырылуда',
        'description' => "{$name} сипаттамасы",
        'start_date' => '2026-01-01',
        'end_date' => '2027-01-01',
        'created_by' => $creator->id,
    ]);
}

/**
 * @return array<string, mixed>
 */
function investorCompanyPayload(Region $region): array
{
    return [
        'legal_form' => 'too',
        'name' => 'Investor Account Company',
        'bin' => '987654321012',
        'registration_date' => '2020-01-15',
        'region_id' => $region->id,
        'activity_type' => 'Өңдеу өнеркәсібі',
        'director_full_name' => 'Компания Басшысы',
        'contact_person' => 'Инвестор Өкілі',
        'phone' => '+7 700 111 22 33',
        'email' => 'company@example.test',
        'website' => 'https://company.example.test',
        'legal_address' => 'Түркістан қаласы',
        'actual_address' => 'Түркістан қаласы',
        'status' => 'active',
        'notes' => null,
        'investor_full_name' => 'Компания Инвесторы',
        'investor_email' => 'investor@example.test',
        'investor_password' => 'password123',
        'investor_password_confirmation' => 'password123',
    ];
}

test('company creation creates its only investor and regular user form cannot create investors', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $region = createInvestorTestRegion();
    $investorRole = Role::where('name', 'investor')->firstOrFail();

    expect(Schema::hasColumn('users', 'company_id'))->toBeTrue();

    $this->actingAs($superadmin)
        ->get('/users/create')
        ->assertInertia(fn (Assert $page) => $page
            ->where(
                'roles',
                fn ($roles) => collect($roles)->doesntContain(
                    fn ($role) => $role['name'] === 'investor'
                )
            ));

    $this->post('/users', [
        'full_name' => 'Қолмен ашылатын инвестор',
        'email' => 'manual-investor@example.test',
        'password' => 'password123',
        'password_confirmation' => 'password123',
        'role_id' => $investorRole->id,
    ])->assertSessionHasErrors('role_id');

    $this->post(route('companies.store'), investorCompanyPayload($region))
        ->assertRedirect();

    $company = Company::query()->sole();
    $investor = $company->investor()->sole();

    expect($investor->full_name)->toBe('Компания Инвесторы')
        ->and($investor->email)->toBe('investor@example.test')
        ->and($investor->company_id)->toBe($company->id)
        ->and($investor->roleModel?->name)->toBe('investor')
        ->and($company->investor()->count())->toBe(1);
});

test('investor automatically sees every active project of their company only', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $assignedRegion = createInvestorTestRegion('Бекітілген аудан');
    $otherRegion = createInvestorTestRegion('Басқа аудан');
    $assigned = createInvestorTestCompany(
        $superadmin,
        $assignedRegion,
        'Investor company'
    );
    $other = createInvestorTestCompany(
        $superadmin,
        $otherRegion,
        'Other company'
    );
    $assignedProject = createInvestorTestProject(
        $superadmin,
        $assigned['company'],
        $assignedRegion,
        'Компания инвесторына көрінетін жоба',
        1500000
    );
    $otherProject = createInvestorTestProject(
        $superadmin,
        $other['company'],
        $otherRegion,
        'Басқа компанияның жабық жобасы',
        9000000
    );

    $this->actingAs($assigned['investor'])
        ->get('/investment-projects')
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->where('projects.data.0.id', $assignedProject->id)
            ->where('stats.total_projects', 1));

    $this->get('/dashboard')
        ->assertInertia(fn (Assert $page) => $page
            ->where('stats.project_count', 1)
            ->where(
                'stats.total_investment',
                fn ($value) => (float) $value === 1500000.0
            ));

    $this->get(route('investment-projects.show', $assignedProject))
        ->assertInertia(fn (Assert $page) => $page
            ->where('project.id', $assignedProject->id)
            ->where('project.investors.0.id', $assigned['investor']->id)
            ->where('isInvolved', true)
            ->where('canModify', false));

    $this->get(route('investment-projects.show', $otherProject))
        ->assertForbidden();
});

test('investor navigation scope is enforced on the server', function () {
    $investor = createInvestorTestUser('investor');

    $this->actingAs($investor)->get('/notifications')->assertOk();
    $this->get('/sezs')->assertForbidden();
    $this->get('/issues')->assertForbidden();
    $this->get('/baskarma-rating')->assertForbidden();
    $this->get('/users')->assertForbidden();
    $this->get('/investment-projects/create')->assertForbidden();
    $this->post('/chat/send', ['message' => 'Барлық жобалар'])
        ->assertForbidden();
});

test('investor can add project evidence but cannot modify status or remove shared data', function () {
    Storage::fake('local');
    Storage::fake('public');

    $superadmin = createInvestorTestUser('superadmin');
    $region = createInvestorTestRegion();
    $scope = createInvestorTestCompany(
        $superadmin,
        $region,
        'Contribution company'
    );
    $project = createInvestorTestProject(
        $superadmin,
        $scope['company'],
        $region,
        'Дәлелдер жобасы',
        3000000
    );

    $this->actingAs($scope['investor'])
        ->post(route('investment-projects.documents.store', $project), [
            'name' => 'Инвестор құжаты',
            'file' => UploadedFile::fake()->create(
                'proof.pdf',
                100,
                'application/pdf'
            ),
            'is_completed' => true,
        ])
        ->assertRedirect();

    $this->post(route('investment-projects.gallery.store', $project), [
        'photos' => [UploadedFile::fake()->image('progress.jpg')],
        'description' => 'Құрылыс барысы',
        'photo_type' => 'gallery',
    ])->assertRedirect();

    $this->post(route('investment-projects.issues.store', $project), [
        'title' => 'Инфрақұрылым мәселесі',
        'description' => 'Электр қуаты қажет',
        'severity' => 'high',
        'status' => 'resolved',
    ])->assertRedirect();

    $document = ProjectDocument::query()->sole();
    $photo = ProjectPhoto::query()->sole();
    $issue = ProjectIssue::query()->sole();

    expect($document->is_completed)->toBeFalse()
        ->and($issue->status)->toBe('open');

    $this->put(route('investment-projects.update-status', $project), [
        'current_status' => 'Инвестор өзгерткен статус',
    ])->assertForbidden();
    $this->delete(route(
        'investment-projects.documents.destroy',
        [$project, $document]
    ))->assertForbidden();
    $this->put(route(
        'investment-projects.gallery.update',
        [$project, $photo]
    ), ['description' => 'Өзгертілді'])->assertForbidden();
    $this->delete(route(
        'investment-projects.gallery.destroy',
        [$project, $photo]
    ))->assertForbidden();
    $this->put(route(
        'investment-projects.issues.update',
        [$project, $issue]
    ), [
        'title' => 'Өзгертілді',
        'description' => 'Өзгертілді',
        'severity' => 'low',
        'status' => 'resolved',
    ])->assertForbidden();
    $this->delete(route(
        'investment-projects.issues.destroy',
        [$project, $issue]
    ))->assertForbidden();

    expect($project->fresh()->current_status)->toBe('Іске асырылуда');
    $this->assertDatabaseHas('project_documents', ['id' => $document->id]);
    $this->assertDatabaseHas('project_photos', ['id' => $photo->id]);
    $this->assertDatabaseHas('project_issues', ['id' => $issue->id]);
});

test('assigned investor receives and completes a project roadmap task', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $region = createInvestorTestRegion();
    $scope = createInvestorTestCompany($superadmin, $region, 'Task company');
    $project = createInvestorTestProject(
        $superadmin,
        $scope['company'],
        $region,
        'Тапсырмасы бар инвестор жобасы',
        3000000
    );

    $this->actingAs($superadmin)
        ->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Инвестор орындайтын тапсырма',
            'description' => 'Инвестор тапсырмасының сипаттамасы',
            'assigned_to' => $scope['investor']->id,
            'start_date' => '2026-08-01',
            'due_date' => '2026-08-31',
        ])
        ->assertRedirect();

    $task = ProjectTask::where('project_id', $project->id)->sole();

    $this->actingAs($scope['investor'])
        ->post(route('investment-projects.tasks.view', [$project, $task]))
        ->assertRedirect();
    $this->post(
        route(
            'investment-projects.tasks.completions.store',
            [$project, $task]
        ),
        ['comment' => 'Инвестор тапсырманы орындады']
    )->assertRedirect();

    $this->assertDatabaseHas('task_completions', [
        'task_id' => $task->id,
        'submitted_by' => $scope['investor']->id,
        'status' => 'pending',
    ]);
});

test('investor cannot be assigned a task outside their company projects', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $region = createInvestorTestRegion();
    $assigned = createInvestorTestCompany(
        $superadmin,
        $region,
        'Assigned company'
    );
    $other = createInvestorTestCompany($superadmin, $region, 'Other company');
    $project = createInvestorTestProject(
        $superadmin,
        $other['company'],
        $region,
        'Басқа компания жобасы',
        4000000
    );

    $this->actingAs($superadmin)
        ->post(route('investment-projects.tasks.store', $project), [
            'title' => 'Қате тағайындалған тапсырма',
            'assigned_to' => $assigned['investor']->id,
        ])
        ->assertSessionHasErrors('assigned_to');
});
