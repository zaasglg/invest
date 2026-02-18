<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$u = App\Models\User::whereHas('roleModel', fn($q) => $q->where('name', 'ispolnitel'))->first();
$isDistrictScoped = $u && $u->isDistrictScoped();

$regionsQuery = App\Models\Region::query();
if ($isDistrictScoped) {
    $userRegion = App\Models\Region::find($u->region_id);
    $regionIds = [$u->region_id];
    if ($userRegion && $userRegion->parent_id) {
        $regionIds[] = $userRegion->parent_id;
    }
    $regionsQuery->whereIn('id', $regionIds);
}
$regions = $regionsQuery->get();

echo "Regions passed to frontend:\n";
foreach ($regions as $r) {
    echo "  id={$r->id} name={$r->name} type={$r->type} parent_id={$r->parent_id}\n";
}
echo "isDistrictScoped={$isDistrictScoped}\n";
echo "userRegionId={$u->region_id}\n";
