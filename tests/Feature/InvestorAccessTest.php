<?php

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectDocument;
use App\Models\ProjectIssue;
use App\Models\ProjectPhoto;
use App\Models\ProjectTask;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Role;
use App\Models\Sez;
use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
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

test('investor can open any region while region projects and issues stay company scoped', function () {
    $superadmin = createInvestorTestUser('superadmin');
    $projectRegion = createInvestorTestRegion('Investor project region');
    $otherRegion = createInvestorTestRegion('Investor readable region');
    $scope = createInvestorTestCompany(
        $superadmin,
        $projectRegion,
        'Region scope company'
    );
    $foreignScope = createInvestorTestCompany(
        $superadmin,
        $projectRegion,
        'Foreign region company'
    );

    $ownProject = createInvestorTestProject(
        $superadmin,
        $scope['company'],
        $projectRegion,
        'Visible region project',
        2500000
    );
    $foreignProject = createInvestorTestProject(
        $superadmin,
        $foreignScope['company'],
        $projectRegion,
        'Hidden region project',
        8800000
    );
    $sez = Sez::create([
        'name' => 'Investor portal SEZ',
        'region_id' => $projectRegion->id,
        'total_area' => 100,
        'status' => 'active',
    ]);
    $industrialZone = IndustrialZone::create([
        'name' => 'Investor portal IZ',
        'region_id' => $projectRegion->id,
        'total_area' => 80,
        'status' => 'active',
    ]);
    $promZone = PromZone::create([
        'name' => 'Investor portal prom zone',
        'region_id' => $projectRegion->id,
        'total_area' => 60,
        'status' => 'active',
    ]);
    $subsoilUser = SubsoilUser::create([
        'name' => 'Hidden investor subsoil user',
        'bin' => '123456789012',
        'region_id' => $projectRegion->id,
        'mineral_type' => 'Limestone',
        'license_status' => 'active',
    ]);
    $ownProject->sezs()->attach($sez);
    $ownProject->industrialZones()->attach($industrialZone);
    $ownProject->promZones()->attach($promZone);
    $ownProject->subsoilUsers()->attach($subsoilUser);
    SubsoilIssue::create([
        'subsoil_user_id' => $subsoilUser->id,
        'description' => 'Hidden investor subsoil issue',
        'severity' => 'high',
        'status' => 'open',
        'created_by' => $superadmin->id,
    ]);

    ProjectIssue::create([
        'project_id' => $ownProject->id,
        'title' => 'Visible investor issue',
        'description' => 'Visible investor issue',
        'severity' => 'medium',
        'status' => 'open',
        'created_by' => $superadmin->id,
    ]);
    ProjectIssue::create([
        'project_id' => $foreignProject->id,
        'title' => 'Hidden foreign issue',
        'description' => 'Hidden foreign issue',
        'severity' => 'high',
        'status' => 'open',
        'created_by' => $superadmin->id,
    ]);

    $this->actingAs($scope['investor'])
        ->get(route('regions.show', $projectRegion))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('region.id', $projectRegion->id)
            ->has('projects', 1)
            ->where('projects.0.id', $ownProject->id)
            ->missing('projects.0.subsoil_users')
            ->has('sezs', 1)
            ->has('industrialZones', 1)
            ->has('promZones', 1)
            ->has('subsoilUsers', 0)
            ->where('stats.projectsCount', 1)
            ->where('stats.projectIssuesCount', 1)
            ->where('stats.sezIssuesCount', 0)
            ->where('stats.izIssuesCount', 0)
            ->where('stats.promIssuesCount', 0)
            ->where('stats.subsoilIssuesCount', 0)
            ->where(
                'stats.totalInvestment',
                fn ($value) => (float) $value === 2500000.0
            ));

    $this->get(route('issues.index', ['region_id' => $projectRegion->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $ownProject->id)
            ->where('issues.data.0.title', 'Visible investor issue')
            ->where('issueStats.total', 1)
            ->has('sectorLabels', 1)
            ->where('sectorLabels.all_projects', 'Барлық жобалар'));

    $this->get(route('issues.index', [
        'region_id' => $projectRegion->id,
        'sector' => 'nedro',
    ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues.data', 1)
            ->where('issues.data.0.entity_id', $ownProject->id)
            ->where('filters.sector', null)
            ->missing('sectorLabels.nedro'));

    foreach ([
        ['type' => 'sez', 'zone' => $sez],
        ['type' => 'industrial-zone', 'zone' => $industrialZone],
        ['type' => 'prom-zone', 'zone' => $promZone],
    ] as $zone) {
        $this->get(route('applicant.zones.show', [
            'zoneType' => $zone['type'],
            'zone' => $zone['zone'],
        ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('sezs/show')
                ->where('portalContext.accountRole', 'investor')
                ->where('portalContext.zoneType', $zone['type'])
                ->has('investmentProjects.data', 1)
                ->where('investmentProjects.data.0.id', $ownProject->id));
    }

    $this->get(route('investment-projects.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('projects.data', 1)
            ->missing('projects.data.0.subsoil_users')
            ->has('subsoilUsers', 0));

    $this->get(route('investment-projects.show', $ownProject))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('project.subsoil_users', 0));

    $this->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('sectorSummary.total.nedro.investment', 0)
            ->where('sectorSummary.total.nedro.projectCount', 0)
            ->where('sectorSummary.total.nedro.problemCount', 0)
            ->where('sectorSummary.total.nedro.jobCount', 0)
            ->has('regionStats.subsoilUsers', 0));

    $this->get(route('regions.show', $otherRegion))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('region.id', $otherRegion->id)
            ->has('projects', 0)
            ->where('stats.projectsCount', 0)
            ->where('stats.projectIssuesCount', 0));
});

test('investor navigation scope is enforced on the server', function () {
    $investor = createInvestorTestUser('investor');

    $this->actingAs($investor)->get('/notifications')->assertOk();
    $this->get('/sezs')->assertForbidden();
    $this->get('/issues')->assertOk();
    $this->get('/baskarma-rating')->assertForbidden();
    $this->get('/users')->assertForbidden();
    $this->get('/investment-projects/create')->assertForbidden();

    config(['services.gemini.api_key' => '']);
    $this->post('/chat/send', ['message' => 'Барлық жобалар'])
        ->assertOk();
});

test('investor AI recommends support and regional assets without leaking other company projects', function () {
    config(['services.gemini.api_key' => '']);

    $superadmin = createInvestorTestUser('superadmin');
    $investorRegion = createInvestorTestRegion('Инвестор AI ауданы');
    $otherRegion = createInvestorTestRegion('Бөгде AI ауданы');
    $scope = createInvestorTestCompany(
        $superadmin,
        $investorRegion,
        'AI Investor company'
    );
    $otherScope = createInvestorTestCompany(
        $superadmin,
        $otherRegion,
        'Other AI company'
    );

    $ownProject = createInvestorTestProject(
        $superadmin,
        $scope['company'],
        $investorRegion,
        'AI инвестордың өз жобасы',
        4500000
    );
    $foreignProject = createInvestorTestProject(
        $superadmin,
        $otherScope['company'],
        $otherRegion,
        'AI инвесторға жабық жоба',
        9900000
    );

    $asset = IndustrialZone::create([
        'name' => 'Инвесторға ұсынылатын индустриалды аймақ',
        'region_id' => $investorRegion->id,
        'status' => 'active',
        'total_area' => 125.5,
        'infrastructure' => [
            'electricity' => ['available' => true, 'capacity' => '20 МВт'],
            'water' => ['available' => true, 'capacity' => '500 м³/тәулік'],
        ],
    ]);
    IndustrialZone::create([
        'name' => 'Бөгде өңір активі',
        'region_id' => $otherRegion->id,
        'status' => 'active',
    ]);

    $response = $this->actingAs($scope['investor'])
        ->postJson('/chat/send', [
            'message' => 'Менің инвестициялық жобама қолдау мен алаң ұсын',
        ])
        ->assertOk();

    $message = $response->json('message');

    expect($message)
        ->toContain($ownProject->name)
        ->toContain('Инвестициялық преференциялар')
        ->toContain($asset->name)
        ->not->toContain($foreignProject->name)
        ->not->toContain('Бөгде өңір активі');
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
        'photos' => [UploadedFile::fake()->createWithContent(
            'progress.png',
            base64_decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
                .'AAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
            )
        )],
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
    Storage::fake('local');

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
        [
            'comment' => 'Инвестор тапсырманы орындады',
            'documents' => [UploadedFile::fake()->create(
                'investor-result.pdf',
                10,
                'application/pdf'
            )],
        ]
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
