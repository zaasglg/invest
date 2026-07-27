<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectChatRead extends Model
{
    protected $fillable = [
        'investment_project_id',
        'user_id',
        'last_read_message_id',
    ];

    public function project()
    {
        return $this->belongsTo(
            InvestmentProject::class,
            'investment_project_id'
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lastReadMessage()
    {
        return $this->belongsTo(
            ProjectChatMessage::class,
            'last_read_message_id'
        );
    }
}
