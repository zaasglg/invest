<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectChatAttachment extends Model
{
    protected $fillable = [
        'project_chat_message_id',
        'original_name',
        'file_path',
        'mime_type',
        'size',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function message()
    {
        return $this->belongsTo(
            ProjectChatMessage::class,
            'project_chat_message_id'
        );
    }
}
