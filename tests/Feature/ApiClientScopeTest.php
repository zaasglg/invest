<?php

use App\Models\ApiClient;
use App\Models\Company;
use App\Models\InvestmentProject;
use App\Models\Region;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;

function scopedApiFixture(): array
{
    $region = Region::create(['name' => 'Allowed district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $foreign = Region::create(['name' => 'Foreign district', 'type' => 'district', 'color' => '#123456', 'icon' => 'factory']);
    $user = User::factory()->create(['phone' => '+77001112233']);
    $company = Company::factory()->create(['region_id' => $region->id, 'notes' => 'Private company note',
        'director_full_name' => 'Confidential director marker']);
    $otherCompany = Company::factory()->create(['region_id' => $foreign->id]);
    $attributes = ['name' => 'API project', 'created_by' => $user->id, 'status' => 'plan',
        'total_investment' => 100, 'current_status' => 'Private project note'];
    $project = InvestmentProject::create([...$attributes, 'company_id' => $company->id, 'region_id' => $region->id]);
    $other = InvestmentProject::create([...$attributes, 'company_id' => $company->id, 'region_id' => $foreign->id]);
    InvestmentProject::create([...$attributes, 'company_id' => $otherCompany->id, 'region_id' => $foreign->id]);
    $project->issues()->create(['title' => 'Internal issue', 'description' => 'Confidential',
        'created_by' => $user->id, 'status' => 'open', 'severity' => 'high']);
    $token = 'inv_'.bin2hex(random_bytes(32));
    $client = ApiClient::create(['name' => 'Scoped client', 'token_hash' => hash('sha256', $token)]);

    return compact('region', 'foreign', 'company', 'project', 'other', 'token', 'client');
}

test('new API clients omit sensitive fields across project and company relationships', function () {
    $data = scopedApiFixture();
    $response = $this->withToken($data['token'])->getJson('/api/v1/projects?region_id='.$data['region']->id)
        ->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonMissingPath('data.0.current_status')
        ->assertJsonMissingPath('data.0.issues')
        ->assertJsonMissingPath('data.0.creator.phone')
        ->assertJsonMissingPath('data.0.company.phone')
        ->assertJsonMissingPath('data.0.company.director_full_name');
    expect($response->getContent())->not->toContain('Private project note', 'Confidential', '+77001112233');
    $this->getJson('/api/v1/companies?region_id='.$data['region']->id)->assertOk()
        ->assertJsonMissingPath('data.0.phone')->assertJsonMissingPath('data.0.notes')
        ->assertJsonMissingPath('data.0.contact_person')->assertJsonMissingPath('data.0.director_full_name');
    $this->getJson('/api/v1/companies?search=Confidential%20director%20marker')->assertOk()->assertJsonCount(0, 'data');
});

test('API region scopes constrain both results and embedded company project counts', function () {
    $data = scopedApiFixture();
    $data['client']->update(['allowed_region_ids' => [$data['region']->id]]);
    $this->withToken($data['token'])->getJson('/api/v1/projects')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $data['project']->id);
    $this->getJson('/api/v1/projects?region_id='.$data['foreign']->id)->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/companies')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $data['company']->id)->assertJsonPath('data.0.projects_count', 1);
});

test('API explicit project scope intersects region scope and cannot leak other company projects', function () {
    $data = scopedApiFixture();
    $data['client']->update(['allowed_project_ids' => [$data['project']->id]]);
    $this->withToken($data['token'])->getJson('/api/v1/projects')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/companies')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.projects_count', 1);
    $data['client']->update(['allowed_region_ids' => [$data['foreign']->id]]);
    $this->getJson('/api/v1/projects')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/v1/companies')->assertOk()->assertJsonCount(0, 'data');
});

test('API permissions can be configured without disclosing or rotating the existing token', function () {
    $data = scopedApiFixture();
    $hash = $data['client']->token_hash;
    expect(Artisan::call('api-client:access', ['client' => $data['client']->id,
        '--region' => [$data['region']->id], '--include-contacts' => true, '--include-internal' => true]))->toBe(0);
    expect(Artisan::output())->not->toContain($data['token'], $hash);
    expect($data['client']->fresh()->token_hash)->toBe($hash);
    $this->withToken($data['token'])->getJson('/api/v1/projects')->assertOk()
        ->assertJsonPath('data.0.current_status', 'Private project note')
        ->assertJsonPath('data.0.issues.0.title', 'Internal issue')
        ->assertJsonPath('data.0.creator.phone', '+77001112233');
    expect(Artisan::call('api-client:access', ['client' => $data['client']->id,
        '--without-contacts' => true, '--without-internal' => true]))->toBe(0);
    $this->getJson('/api/v1/projects')->assertOk()->assertJsonMissingPath('data.0.creator.phone')
        ->assertJsonMissingPath('data.0.issues');
});

test('API client creation supports explicit regional permissions and safe defaults', function () {
    $data = scopedApiFixture();
    expect(Artisan::call('api-client:create', ['name' => 'New restricted client', '--region' => [$data['region']->id]]))->toBe(0);
    $client = ApiClient::where('name', 'New restricted client')->sole();
    expect($client->allowed_region_ids)->toBe([$data['region']->id])
        ->and($client->include_contacts)->toBeFalse()->and($client->include_internal)->toBeFalse();
});
