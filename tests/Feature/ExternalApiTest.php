<?php

use App\Models\ApiClient;
use App\Models\Company;
use App\Models\CompanyDocument;
use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectIssue;
use App\Models\ProjectPhoto;
use App\Models\ProjectProductionFact;
use App\Models\ProjectProductionPlan;
use App\Models\ProjectTask;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

test('external API exposes exactly two analytics routes', function () {
    $uris = collect(app('router')->getRoutes()->getRoutes())
        ->map(fn ($route) => $route->uri())
        ->filter(fn (string $uri) => str_starts_with($uri, 'api/v1/'))
        ->sort()
        ->values()
        ->all();

    expect($uris)->toBe([
        'api/v1/companies',
        'api/v1/projects',
    ]);
});

function externalApiToken(array $overrides = []): string
{
    $token = 'inv_'.bin2hex(random_bytes(32));

    ApiClient::create(array_merge([
        'name' => 'External API test client',
        'token_hash' => hash('sha256', $token),
        'is_active' => true,
    ], $overrides));

    return $token;
}

function externalApiRegion(): Region
{
    return Region::create([
        'name' => 'API test region',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);
}

function externalApiCompany(Region $region): Company
{
    return Company::create([
        'legal_form' => 'too',
        'name' => 'API Test Company',
        'bin' => '123456789012',
        'registration_date' => '2020-01-15',
        'region_id' => $region->id,
        'activity_type' => 'Өңдеу өнеркәсібі',
        'director_full_name' => 'API Басшы',
        'phone' => '+7 700 111 22 33',
        'email' => 'company@example.test',
        'legal_address' => 'Түркістан қаласы',
        'status' => 'active',
    ]);
}

test('external API requires an active non-expired bearer token', function () {
    $this->getJson('/api/v1/companies')
        ->assertUnauthorized()
        ->assertJsonPath('error', 'invalid_api_token');

    $this->withToken('wrong-token')
        ->getJson('/api/v1/companies')
        ->assertUnauthorized();

    $expiredToken = externalApiToken([
        'name' => 'Expired client',
        'expires_at' => now()->subMinute(),
    ]);

    $this->withToken($expiredToken)
        ->getJson('/api/v1/companies')
        ->assertUnauthorized();

    $activeToken = externalApiToken();

    $this->withToken($activeToken)
        ->getJson('/api/v1/companies')
        ->assertOk();

    expect(ApiClient::where('name', 'External API test client')->first()
        ?->last_used_at)->not->toBeNull();
});

test('companies API returns analytics data without email or documents', function () {
    $region = externalApiRegion();
    $company = externalApiCompany($region);
    Company::create([
        'legal_form' => 'other',
        'name' => 'Other API Company',
        'status' => 'inactive',
    ]);
    CompanyDocument::create([
        'company_id' => $company->id,
        'name' => 'license.pdf',
        'file_path' => 'company-documents/1/license.pdf',
        'type' => 'pdf',
        'size' => 1024,
    ]);
    $token = externalApiToken();

    $this->withToken($token)
        ->getJson('/api/v1/companies?status=active&search=API%20Test')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $company->id)
        ->assertJsonPath('data.0.bin', '123456789012')
        ->assertJsonPath('data.0.region.name', $region->name)
        ->assertJsonMissingPath('data.0.email')
        ->assertJsonMissingPath('data.0.documents')
        ->assertJsonStructure(['data', 'links', 'meta']);

    $this->withToken($token)
        ->getJson("/api/v1/companies/{$company->id}")
        ->assertNotFound();
});

test('projects API returns analytics data without operational content', function () {
    $region = externalApiRegion();
    $company = externalApiCompany($region);
    $creator = User::factory()->create();
    $projectType = ProjectType::create(['name' => 'API өнеркәсіп']);
    $project = InvestmentProject::create([
        'name' => 'API инвестициялық жобасы',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'description' => 'API арқылы берілетін жоба',
        'current_status' => 'Құрылыс жүргізілуде',
        'region_id' => $region->id,
        'project_type_id' => $projectType->id,
        'jobs_count' => 50,
        'total_investment' => 150000000,
        'status' => 'implementation',
        'start_date' => '2026-01-01',
        'end_date' => '2027-12-31',
        'created_by' => $creator->id,
        'infrastructure' => [
            'electricity' => [
                'needed' => true,
                'required_capacity' => 100,
                'used_capacity' => 50,
            ],
        ],
    ]);
    $project->projectTypes()->sync([$projectType->id]);
    $productionPlan = ProjectProductionPlan::create([
        'project_id' => $project->id,
        'product_name' => 'Кірпіш',
        'planned_quantity' => 1000,
        'unit' => 'piece',
        'planned_amount' => 500000,
        'period' => 'month',
    ]);
    ProjectProductionFact::create([
        'production_plan_id' => $productionPlan->id,
        'period_key' => '2026-01',
        'reporting_year' => 2026,
        'period_number' => 1,
        'actual_quantity' => 900,
        'actual_amount' => 450000,
        'notes' => 'Қаңтар айының нақты көрсеткіші',
        'reported_by' => $creator->id,
    ]);
    ProjectIssue::create([
        'project_id' => $project->id,
        'title' => 'Инфрақұрылым тәуекелі',
        'description' => 'Электр желісіне қосылу мерзімі',
        'category' => 'infrastructure',
        'severity' => 'critical',
        'status' => 'open',
        'created_by' => $creator->id,
    ]);
    ProjectDocument::create([
        'project_id' => $project->id,
        'name' => 'project.pdf',
        'file_path' => 'project-documents/project.pdf',
        'type' => 'pdf',
    ]);
    ProjectPhoto::create([
        'project_id' => $project->id,
        'file_path' => 'project-photos/progress.jpg',
        'photo_type' => 'gallery',
        'description' => 'Құрылыс барысы',
    ]);
    ProjectTask::create([
        'project_id' => $project->id,
        'title' => 'API-ге берілмейтін тапсырма',
        'assigned_to' => $creator->id,
        'created_by' => $creator->id,
        'start_date' => '2026-01-01',
        'due_date' => '2026-02-01',
        'status' => 'new',
    ]);
    InvestmentProject::create([
        'name' => 'Deleted API project',
        'company_id' => $company->id,
        'company_name' => $company->display_name,
        'region_id' => $region->id,
        'total_investment' => 1,
        'status' => 'plan',
        'created_by' => $creator->id,
        'is_deleted' => true,
        'deleted_by' => $creator->id,
        'deleted_at' => now(),
    ]);
    $token = externalApiToken();

    $this->withToken($token)
        ->getJson(
            '/api/v1/projects?company_id='.$company->id
            .'&project_type_id='.$projectType->id
            .'&status=implementation'
        )
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $project->id)
        ->assertJsonPath(
            'data.0.company.display_name',
            $company->display_name
        )
        ->assertJsonPath('data.0.project_types.0.id', $projectType->id)
        ->assertJsonPath('data.0.production_plans.0.product_name', 'Кірпіш')
        ->assertJsonPath(
            'data.0.production_plans.0.facts.0.actual_quantity',
            '900.000'
        )
        ->assertJsonPath(
            'data.0.issues.0.title',
            'Инфрақұрылым тәуекелі'
        )
        ->assertJsonPath('data.0.current_status', 'Құрылыс жүргізілуде')
        ->assertJsonPath(
            'data.0.infrastructure.electricity.required_capacity',
            100
        )
        ->assertJsonMissingPath('data.0.company.email')
        ->assertJsonMissingPath(
            'data.0.production_plans.0.facts.0.reporter.email'
        )
        ->assertJsonMissingPath('data.0.documents')
        ->assertJsonMissingPath('data.0.photos')
        ->assertJsonMissingPath('data.0.tasks');

    $this->withToken($token)
        ->getJson("/api/v1/projects/{$project->id}")
        ->assertNotFound();

    $this->withToken($token)
        ->getJson('/api/v1/projects')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('API client commands issue a one-time token and revoke access', function () {
    $exitCode = Artisan::call('api-client:create', [
        'name' => 'Command API client',
        '--expires-at' => now()->addYear()->toDateString(),
    ]);
    $output = Artisan::output();

    expect($exitCode)->toBe(0)
        ->and($output)->toMatch('/inv_[a-f0-9]{64}/');

    preg_match('/inv_[a-f0-9]{64}/', $output, $matches);
    $token = $matches[0];
    $client = ApiClient::where('name', 'Command API client')->sole();

    expect($client->token_hash)->toBe(hash('sha256', $token))
        ->and($client->token_hash)->not->toBe($token);

    $this->withToken($token)
        ->getJson('/api/v1/companies')
        ->assertOk();

    expect(Artisan::call('api-client:revoke', [
        'client' => $client->id,
    ]))->toBe(0);

    $this->withToken($token)
        ->getJson('/api/v1/companies')
        ->assertUnauthorized();
});
