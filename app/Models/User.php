<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use App\Services\InvestmentProjectAccessService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    public const BASKARMA_TYPES = ['oblast', 'district', 'additional'];

    public const INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT = 'turkistan_invest';

    public const INVEST_SUB_ROLE_TURKISTAN_ATTRACTION = 'turkistan_invest_attraction';

    public const TURKISTAN_INVEST_SUB_ROLES = [
        self::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT,
        self::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
    ];

    public const INVEST_SUB_ROLES = [
        ...self::TURKISTAN_INVEST_SUB_ROLES,
        'aea',
        'ia',
        'prom_zone',
    ];

    public const SUPPORTED_ROLES = [
        'superadmin',
        'invest',
        'akim',
        'zamakim',
        'ispolnitel',
        'moderator',
        'prokuror',
        'investor',
        'applicant',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'full_name',
        'email',
        'requires_email_verification',
        'phone',
        'password',
        'role',
        'region_id',
        'role_id',
        'company_id',
        'invest_sub_role',
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
            'password' => 'hashed',
            'requires_email_verification' => 'boolean',
        ];
    }

    /**
     * Send the localized email verification notification.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    /**
     * Send the localized password reset notification.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function region()
    {
        return $this->belongsTo(Region::class);
    }

    public function roleModel()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function hasSupportedRole(): bool
    {
        return in_array(
            $this->roleModel?->name,
            self::SUPPORTED_ROLES,
            true
        );
    }

    public function isTurkistanInvestAccompaniment(): bool
    {
        return $this->roleModel?->name === 'invest'
            && $this->invest_sub_role === self::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT;
    }

    public function isTurkistanInvestAttraction(): bool
    {
        return $this->roleModel?->name === 'invest'
            && $this->invest_sub_role === self::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION;
    }

    public function isTurkistanInvestDirection(): bool
    {
        return $this->roleModel?->name === 'invest'
            && in_array($this->invest_sub_role, self::TURKISTAN_INVEST_SUB_ROLES, true);
    }

    public function canAccessTurkistanProjectStatus(string $status): bool
    {
        return match ($this->invest_sub_role) {
            self::INVEST_SUB_ROLE_TURKISTAN_ACCOMPANIMENT => $status !== 'plan',
            self::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION => $status === 'plan',
            default => true,
        };
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

    // Проекты, в которых пользователь является куратором
    public function curatedProjects()
    {
        return $this->belongsToMany(InvestmentProject::class, 'investment_project_curator')
            ->withTimestamps();
    }

    /**
     * Projects owned by the investor account's company.
     */
    public function investorProjects()
    {
        return $this->hasMany(
            InvestmentProject::class,
            'company_id',
            'company_id'
        );
    }

    public function investmentApplications()
    {
        return $this->hasMany(InvestmentApplication::class);
    }

    /**
     * Get the restricted sector type for an invest sub-role.
     * Returns null if the user has no invest sub-role or belongs to either
     * Turkistan Invest project direction.
     */
    public function restrictedSectorType(): ?string
    {
        return match ($this->invest_sub_role) {
            'aea' => 'sez',
            'ia' => 'industrial_zone',
            'prom_zone' => 'prom_zone',
            default => null,
        };
    }

    /**
     * Whether the user is an invest user restricted to a single sector type.
     */
    public function isSectorRestrictedInvest(): bool
    {
        if ($this->roleModel?->name !== 'invest') {
            return false;
        }

        return in_array($this->invest_sub_role, ['aea', 'ia', 'prom_zone'], true);
    }

    /**
     * Determine if the user is scoped to their district.
     * Invest accounts with a region and district leadership are scoped.
     * All ispolnitel types can see everything.
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

        // District/city leadership is scoped to the assigned region.
        if (in_array($roleName, ['akim', 'zamakim'], true)) {
            $this->loadMissing('region');

            return $this->region && $this->region->type !== 'oblast';
        }

        // Ispolnitel accounts are NOT district scoped - they can see everything
        return false;
    }

    /**
     * Determine if the user is oblast leadership (akim or zamakim)
     * (sees all projects of that oblast and its districts).
     */
    public function isOblastScopedAkim(): bool
    {
        if (! in_array($this->roleModel?->name, ['akim', 'zamakim'], true)) {
            return false;
        }

        if (! $this->region_id) {
            return false;
        }

        $this->loadMissing('region');

        return $this->region && $this->region->type === 'oblast';
    }

    public function canSwitchDashboardMode(): bool
    {
        $this->loadMissing('roleModel');
        $roleName = $this->roleModel?->name;

        if (in_array($roleName, ['superadmin', 'prokuror'], true)) {
            return true;
        }

        if (! in_array($roleName, ['akim', 'zamakim'], true)) {
            return false;
        }

        $this->loadMissing('region');

        return $this->region !== null;
    }

    /**
     * Determine if the user is Regional Management (any ispolnitel).
     * All ispolnitel types can see everything.
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
        if ($this->roleModel?->name === 'investor') {
            return $this->company_id !== null
                && (int) $this->company_id === (int) $project->company_id;
        }

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

        if ($project->attractionActivities()->where('responsible_id', $this->id)
            ->whereIn('status', ['planned', 'in_progress', 'pending_review'])->exists()) {
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
        if (! app(InvestmentProjectAccessService::class)->canView($this, $project)) {
            return false;
        }

        $roleName = $this->roleModel?->name;

        // Ispolnitel and investor can only download from involved projects
        if (in_array($roleName, ['ispolnitel', 'investor'], true)) {
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
