<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::withCount('users')->latest()->paginate(15)->withQueryString();

        return Inertia::render('roles/index', [
            'roles' => $roles,
        ]);
    }

    public function create()
    {
        return Inertia::render('roles/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        Role::create($validated);

        return redirect()->route('roles.index')->with('success', 'Роль создана.');
    }

    public function edit(Role $role)
    {
        return Inertia::render('roles/edit', [
            'role' => $role,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
            'display_name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $role->update($validated);

        return redirect()->route('roles.index')->with('success', 'Роль обновлена.');
    }

    public function destroy(Role $role)
    {
        if ($role->users()->count() > 0) {
            return redirect()->back()->with('error', 'Невозможно удалить роль, так как она назначена пользователям.');
        }

        $role->delete();

        return redirect()->back()->with('success', 'Роль удалена.');
    }
}
