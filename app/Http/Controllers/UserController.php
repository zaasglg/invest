<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with(['region', 'roleModel'])->latest();
        $baskarmaType = $request->string('baskarma_type')->toString();
        $search = trim($request->string('search')->toString());

        if (in_array($baskarmaType, User::BASKARMA_TYPES, true)) {
            $query->where('baskarma_type', $baskarmaType);
        }

        if ($search !== '') {
            $searchPattern = '%'.$search.'%';

            $query->where(function (Builder $query) use ($searchPattern) {
                $query
                    ->whereLike('full_name', $searchPattern, caseSensitive: false)
                    ->orWhereLike('position', $searchPattern, caseSensitive: false)
                    ->orWhereHas('region', function (Builder $regionQuery) use ($searchPattern) {
                        $regionQuery->whereLike('name', $searchPattern, caseSensitive: false);
                    });
            });
        }

        $users = $query->paginate(15)->withQueryString();

        // dd($users->toArray());
        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => [
                'baskarma_type' => $baskarmaType,
                'search' => $search,
            ],
        ]);
    }

    public function create()
    {
        $regions = Region::all();
        $roles = Role::where('name', '!=', 'investor')->get();

        return Inertia::render('users/create', [
            'regions' => $regions,
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        if ($request->role_id === 'none') {
            $request->merge(['role_id' => null]);
        }

        $investRoleId = Role::where('name', 'invest')->value('id');
        $ispolnitelRoleId = Role::where('name', 'ispolnitel')->value('id');
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => [
                'required',
                Rule::exists('roles', 'id')
                    ->where(fn ($query) => $query->where('name', '!=', 'investor')),
            ],
            'region_id' => 'nullable|exists:regions,id',
            'baskarma_type' => [
                $ispolnitelRoleId ? 'required_if:role_id,'.$ispolnitelRoleId : 'nullable',
                'nullable',
                'in:'.implode(',', User::BASKARMA_TYPES),
            ],
            'position' => 'nullable|string|max:255',
            'telegram_chat_id' => 'nullable|string|max:50',
            'invest_sub_role' => [
                $investRoleId ? 'required_if:role_id,'.$investRoleId : 'nullable',
                'nullable',
                'in:turkistan_invest,aea,ia,prom_zone',
            ],
        ]);

        if (isset($validated['role_id']) && $validated['role_id'] === 'none') {
            $validated['role_id'] = null;
        }

        if (isset($validated['region_id']) && $validated['region_id'] === 'none') {
            $validated['region_id'] = null;
        }

        // Clear ispolnitel fields if not ispolnitel role
        $role = $validated['role_id'] ? Role::find($validated['role_id']) : null;
        if (! $role || $role->name !== 'ispolnitel') {
            $validated['baskarma_type'] = null;
            $validated['position'] = null;
        }

        // For district ispolnitel, set position to district (region) name
        if ($role && $role->name === 'ispolnitel' && ($validated['baskarma_type'] ?? null) === 'district' && ! empty($validated['region_id'])) {
            $region = Region::find($validated['region_id']);
            if ($region) {
                $validated['position'] = $region->name;
            }
        }

        // Clear invest_sub_role if not invest role
        if (! $role || $role->name !== 'invest') {
            $validated['invest_sub_role'] = null;
        }

        $validated['password'] = Hash::make($validated['password']);
        $validated['email'] = Str::lower($validated['email']);

        User::create($validated);

        return redirect()->route('users.index')->with('success', 'Пайдаланушы құрылды.');
    }

    public function edit(User $user)
    {
        if ($user->roleModel?->name === 'investor') {
            if ($user->company_id) {
                return redirect()->route('companies.edit', $user->company_id);
            }

            abort(403, 'Инвестор аккаунты компания бөлімінен басқарылады.');
        }

        $regions = Region::all();
        $roles = Role::where('name', '!=', 'investor')->get();

        return Inertia::render('users/edit', [
            'user' => $user->load(['region', 'roleModel']),
            'regions' => $regions,
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, User $user)
    {
        abort_if(
            $user->roleModel?->name === 'investor',
            403,
            'Инвестор аккаунты компания бөлімінен басқарылады.'
        );

        if ($request->role_id === 'none') {
            $request->merge(['role_id' => null]);
        }

        $investRoleId = Role::where('name', 'invest')->value('id');
        $ispolnitelRoleId = Role::where('name', 'ispolnitel')->value('id');
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => [
                'required',
                Rule::exists('roles', 'id')
                    ->where(fn ($query) => $query->where('name', '!=', 'investor')),
            ],
            'region_id' => 'nullable|exists:regions,id',
            'baskarma_type' => [
                $ispolnitelRoleId ? 'required_if:role_id,'.$ispolnitelRoleId : 'nullable',
                'nullable',
                'in:'.implode(',', User::BASKARMA_TYPES),
            ],
            'position' => 'nullable|string|max:255',
            'telegram_chat_id' => 'nullable|string|max:50',
            'invest_sub_role' => [
                $investRoleId ? 'required_if:role_id,'.$investRoleId : 'nullable',
                'nullable',
                'in:turkistan_invest,aea,ia,prom_zone',
            ],
        ]);

        if (isset($validated['role_id']) && $validated['role_id'] === 'none') {
            $validated['role_id'] = null;
        }

        if (isset($validated['region_id']) && $validated['region_id'] === 'none') {
            $validated['region_id'] = null;
        }

        // Clear ispolnitel fields if not ispolnitel role
        $role = $validated['role_id'] ? Role::find($validated['role_id']) : null;
        if (! $role || $role->name !== 'ispolnitel') {
            $validated['baskarma_type'] = null;
            $validated['position'] = null;
        }

        // For district ispolnitel, set position to district (region) name
        if ($role && $role->name === 'ispolnitel' && ($validated['baskarma_type'] ?? null) === 'district' && ! empty($validated['region_id'])) {
            $region = Region::find($validated['region_id']);
            if ($region) {
                $validated['position'] = $region->name;
            }
        }

        // Clear invest_sub_role if not invest role
        if (! $role || $role->name !== 'invest') {
            $validated['invest_sub_role'] = null;
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $validated['email'] = Str::lower($validated['email']);

        $user->update($validated);

        return redirect()->route('users.index')->with('success', 'Пайдаланушы жаңартылды.');
    }

    public function destroy(User $user)
    {
        // Prevent deleting current user
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'Өз аккаунтыңызды жоюға болмайды.');
        }

        if ($user->roleModel?->name === 'investor' && $user->company_id) {
            return redirect()->back()->with(
                'error',
                'Компанияның инвестор аккаунтын бөлек жоюға болмайды.'
            );
        }

        $user->delete();

        return redirect()->back()->with('success', 'Пайдаланушы жойылды.');
    }
}
