<?php

namespace App\Http\Controllers;

use App\Models\ProjectType;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectTypeController extends Controller
{
    public function index()
    {
        $types = ProjectType::latest()->paginate(15)->withQueryString();

        return Inertia::render('project-types/index', [
            'types' => $types,
        ]);
    }

    public function create()
    {
        return Inertia::render('project-types/create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:project_types',
        ]);

        ProjectType::create($validated);

        return redirect()->route('project-types.index')->with('success', 'Тип проекта создан.');
    }

    public function edit(ProjectType $projectType)
    {
        return Inertia::render('project-types/edit', [
            'projectType' => $projectType,
        ]);
    }

    public function update(Request $request, ProjectType $projectType)
    {
        $validated = $request->validate([
            // unique but ignore current id
            'name' => 'required|string|max:255|unique:project_types,name,'.$projectType->id,
        ]);

        $projectType->update($validated);

        return redirect()->route('project-types.index')->with('success', 'Тип проекта обновлен.');
    }

    public function destroy(ProjectType $projectType)
    {
        $projectType->delete();

        return redirect()->back()->with('success', 'Тип проекта удален.');
    }
}
