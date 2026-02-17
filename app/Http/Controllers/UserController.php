<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with(['region', 'roleModel'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function create()
    {
        $regions = Region::all();
        $roles = Role::all();

        return Inertia::render('users/create', [
            'regions' => $regions,
            'roles' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
            'role_id' => 'nullable|exists:roles,id',
            'region_id' => 'nullable|exists:regions,id',
            'baskarma_type' => 'nullable|in:oblast,district',
            'position' => 'nullable|string|max:255',
        ]);

        if (isset($validated['role_id']) && $validated['role_id'] === 'none') {
            $validated['role_id'] = null;
        }

        if (isset($validated['region_id']) && $validated['region_id'] === 'none') {
            $validated['region_id'] = null;
        }

        // Clear baskarma fields if not baskarma role
        $role = $validated['role_id'] ? Role::find($validated['role_id']) : null;
        if (!$role || $role->name !== 'baskarma') {
            $validated['baskarma_type'] = null;
            $validated['position'] = null;
        }

        $validated['password'] = Hash::make($validated['password']);

        User::create($validated);

        return redirect()->route('users.index')->with('success', 'Пользователь создан.');
    }

    public function edit(User $user)
    {
        $regions = Region::all();
        $roles = Role::all();

        return Inertia::render('users/edit', [
            'user' => $user->load(['region', 'roleModel']),
            'regions' => $regions,
            'roles' => $roles,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'password' => 'nullable|string|min:8|confirmed',
            'role_id' => 'nullable|exists:roles,id',
            'region_id' => 'nullable|exists:regions,id',
            'baskarma_type' => 'nullable|in:oblast,district',
            'position' => 'nullable|string|max:255',
        ]);

        if (isset($validated['role_id']) && $validated['role_id'] === 'none') {
            $validated['role_id'] = null;
        }

        if (isset($validated['region_id']) && $validated['region_id'] === 'none') {
            $validated['region_id'] = null;
        }

        // Clear baskarma fields if not baskarma role
        $role = $validated['role_id'] ? Role::find($validated['role_id']) : null;
        if (!$role || $role->name !== 'baskarma') {
            $validated['baskarma_type'] = null;
            $validated['position'] = null;
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        return redirect()->route('users.index')->with('success', 'Пользователь обновлен.');
    }

    public function destroy(User $user)
    {
        // Prevent deleting current user
        if ($user->id === auth()->id()) {
            return redirect()->back()->with('error', 'Вы не можете удалить свой собственный аккаунт.');
        }

        $user->delete();

        return redirect()->back()->with('success', 'Пользователь удален.');
    }
}
