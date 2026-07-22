<?php

use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

function createChatUser(
    string $roleName = 'superadmin',
    ?Region $region = null,
): User {
    $role = Role::create([
        'name' => $roleName,
        'display_name' => $roleName,
        'description' => 'Chat test role',
    ]);

    return User::factory()->create([
        'role' => $roleName === 'superadmin' ? 'admin' : 'invest',
        'role_id' => $role->id,
        'region_id' => $region?->id,
    ]);
}

function createChatRegion(string $name): Region
{
    return Region::create([
        'name' => $name,
        'type' => 'district',
        'color' => '#0f1b3d',
        'icon' => 'factory',
    ]);
}

function createChatProject(
    User $creator,
    Region $region,
    string $name,
): InvestmentProject {
    $type = ProjectType::firstOrCreate(['name' => 'Өнеркәсіп']);

    return InvestmentProject::create([
        'name' => $name,
        'company_name' => 'Test Company',
        'description' => 'Керамикалық өнім шығаратын өндірістік жоба',
        'region_id' => $region->id,
        'project_type_id' => $type->id,
        'sector' => 'industrial_zone',
        'total_investment' => 1500000000,
        'status' => 'implementation',
        'jobs_count' => 120,
        'capacity' => 'Жылына 50 000 тонна',
        'infrastructure' => [
            'electricity' => '10 МВт',
            'water' => 'Қосылған',
        ],
        'created_by' => $creator->id,
    ]);
}

beforeEach(function () {
    config()->set('services.groq.api_key', 'test-groq-key');
    config()->set('services.groq.model', 'llama-3.3-70b-versatile');
    config()->set('services.groq.base_url', 'https://api.groq.com/openai/v1');
});

test('chat sends role-scoped website context and history to Groq', function () {
    $user = createChatUser();
    $region = createChatRegion('Түркістан қаласы');
    createChatProject($user, $region, 'Құрылыс керамикасы зауыты');

    Http::fake([
        'api.groq.com/*' => Http::response([
            'choices' => [
                [
                    'message' => [
                        'content' => 'Иә, жүйеде керамика зауыты жобасы бар.',
                    ],
                ],
            ],
        ]),
    ]);

    $response = $this->actingAs($user)->postJson('/chat/send', [
        'message' => 'Расскажи подробно об этом проекте',
        'history' => [
            [
                'role' => 'user',
                'content' => 'Есть ли проект керамического завода?',
            ],
            [
                'role' => 'assistant',
                'content' => 'Да, такой проект найден.',
            ],
        ],
    ]);

    $response
        ->assertOk()
        ->assertJson([
            'message' => 'Иә, жүйеде керамика зауыты жобасы бар.',
            'source' => 'groq',
        ]);

    Http::assertSent(function (Request $request) {
        $payload = $request->data();
        $systemPrompt = $payload['messages'][0]['content'] ?? '';

        return $request->url() === 'https://api.groq.com/openai/v1/chat/completions'
            && $request->hasHeader('Authorization', 'Bearer test-groq-key')
            && $payload['model'] === 'llama-3.3-70b-versatile'
            && str_contains($systemPrompt, 'Құрылыс керамикасы зауыты')
            && str_contains($systemPrompt, 'Жылына 50 000 тонна')
            && collect($payload['messages'])->contains(
                fn (array $message) => $message['role'] === 'assistant'
                    && $message['content'] === 'Да, такой проект найден.',
            );
    });
});

test('chat does not send unrelated questions to Groq', function () {
    $user = createChatUser();
    Http::fake();

    $response = $this->actingAs($user)->postJson('/chat/send', [
        'message' => 'Какая сегодня погода в Алматы?',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('source', 'local');

    Http::assertNothingSent();
});

test('chat project context respects district access', function () {
    $visibleRegion = createChatRegion('Сайрам ауданы');
    $hiddenRegion = createChatRegion('Келес ауданы');
    $user = createChatUser('invest', $visibleRegion);

    createChatProject($user, $visibleRegion, 'Көрінетін керамика зауыты');
    createChatProject($user, $hiddenRegion, 'Жасырын керамика зауыты');

    Http::fake([
        'api.groq.com/*' => Http::response([
            'choices' => [
                ['message' => ['content' => 'Бір жоба табылды.']],
            ],
        ]),
    ]);

    $this->actingAs($user)
        ->postJson('/chat/send', ['message' => 'Қандай керамика жобалары бар?'])
        ->assertOk()
        ->assertJsonPath('source', 'groq');

    Http::assertSent(function (Request $request) {
        $systemPrompt = $request->data()['messages'][0]['content'] ?? '';

        return str_contains($systemPrompt, 'Көрінетін керамика зауыты')
            && ! str_contains($systemPrompt, 'Жасырын керамика зауыты');
    });
});

test('chat requires authentication', function () {
    $this->postJson('/chat/send', ['message' => 'Какие проекты есть?'])
        ->assertUnauthorized();
});
