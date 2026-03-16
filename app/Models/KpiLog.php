<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KpiLog extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'action',
        'score',
    ];

    public static function log(int $projectId, string $action, int $score = 0): void
    {
        $user = auth()->user();
        if (! $user) {
            return;
        }

        static::create([
            'user_id' => $user->id,
            'project_id' => $projectId,
            'action' => $action,
            'score' => $score,
        ]);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class);
    }
}
