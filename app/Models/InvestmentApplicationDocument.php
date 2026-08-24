<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvestmentApplicationDocument extends Model
{
    protected $fillable = [
        'investment_application_id',
        'name',
        'file_path',
        'type',
        'size',
        'uploaded_by',
    ];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return ['size' => 'integer'];
    }

    public function application()
    {
        return $this->belongsTo(InvestmentApplication::class, 'investment_application_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
