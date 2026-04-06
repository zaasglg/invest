<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'full_name',
        'email',
        'phone',
        'password',
        'role',
        'region_id',
        'role_id',
        'baskarma_type',
        'position',
        'telegram_chat_id',
        'avatar',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function roleModel()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    // Проекты, в которых пользователь является исполнителем
    public function executedProjects()
    {
        return $this->hasMany(InvestmentProject::class, 'executor_id');
    }

    // Проекты, в которых пользователь является вовлеченным лицом
    public function involvedProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_user');
    }

    /**
     * Determine if the user is scoped to their district.
     * This applies to 'invest' role only.
     * Ispolnitel (both district and oblast) can see everything.
     */
    public function isDistrictScoped(): bool
    {
        if (! $this->region_id) {
            return false;
        }

        $roleName = $this->roleModel?->name;

        // Invest is always district scoped if they have a region
        if ($roleName === 'invest') {
            return true;
        }

        // Ispolnitel (both district and oblast) are NOT district scoped - they can see everything
        return false;
    }

    /**
     * Determine if the user is Regional Management (any ispolnitel).
     * Both district and oblast ispolnitel can see everything.
     */
    public function isRegionalManagement(): bool
    {
        return $this->roleModel?->name === 'ispolnitel';
    }

    /**
     * Check if the user is involved in the given project.
     * Ispolnitel is "involved" if they are an executor or have tasks assigned.
     */
    public function isInvolvedInProject(InvestmentProject $project): bool
    {
        // User is creator of the project
        if ((int) $project->created_by === (int) $this->id) {
            return true;
        }

        // User is an executor of the project
        if ($project->executors()->where('users.id', $this->id)->exists()) {
            return true;
        }

        // User has tasks assigned in this project
        if ($project->tasks()->where('assigned_to', $this->id)->exists()) {
            return true;
        }

        return false;
    }

    /**
     * Determine if the user can download files from the given project.
     * Ispolnitel can only download from projects they are involved in.
     */
    public function canDownloadFromProject(InvestmentProject $project): bool
    {
        $roleName = $this->roleModel?->name;

        // Ispolnitel can only download from involved projects
        if ($roleName === 'ispolnitel') {
            return $this->isInvolvedInProject($project);
        }

        // All other roles can download
        return true;
    }

    /**
     * Append avatar_url to serialization.
     */
    protected $appends = ['avatar_url'];

    /**
     * Get the full URL for the user's avatar.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        return $this->avatar ? '/storage/'.$this->avatar : null;
    }
}
