<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectChatMessage extends Model
{
    protected $fillable = [
        'investment_project_id',
        'user_id',
        'message',
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

    public function attachments()
    {
        return $this->hasMany(
            ProjectChatAttachment::class,
            'project_chat_message_id'
        );
    }
}
