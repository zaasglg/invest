<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvestmentApplicationStatusHistory extends Model
{
    protected $fillable = [
        'investment_application_id',
        'from_status',
        'to_status',
        'changed_by',
        'comment',
        'metadata',
    ];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }

    public function application()
    {
        return $this->belongsTo(InvestmentApplication::class, 'investment_application_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
