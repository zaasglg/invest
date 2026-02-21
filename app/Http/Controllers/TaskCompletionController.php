<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectTask;
use App\Models\TaskCompletion;
use App\Models\TaskCompletionFile;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class TaskCompletionController extends Controller
{
    /**
     * Басқарма submits a task completion (with files and comment).
     */
    public function store(Request $request, InvestmentProject $investmentProject, ProjectTask $task)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        $request->validate([
            'comment' => 'nullable|string|max:2000',
            'documents' => 'nullable|array|max:10',
            'documents.*' => 'file|max:20480',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:20480',
        ]);

        $completion = TaskCompletion::create([
            'task_id' => $task->id,
            'submitted_by' => Auth::id(),
            'comment' => $request->input('comment'),
            'status' => 'pending',
        ]);

        // Save uploaded documents
        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('task-completions', 'public');
                TaskCompletionFile::create([
                    'completion_id' => $completion->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => 'document',
                ]);
            }
        }

        // Save uploaded photos
        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                $path = $file->store('task-completions', 'public');
                TaskCompletionFile::create([
                    'completion_id' => $completion->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => 'photo',
                ]);
            }
        }

        // Update task status to in_progress
        $task->update(['status' => 'in_progress']);

        // Notify only the user who assigned the task (creator) and superadmins.
        $notifyUserIds = collect();

        // Task creator (the user who created the task)
        if ($task->created_by) {
            $notifyUserIds->push($task->created_by);
        }

        // Superadmins
        $superadminIds = User::whereHas('roleModel', fn ($q) => $q->where('name', 'superadmin'))->pluck('id');
        $notifyUserIds = $notifyUserIds->merge($superadminIds);

        // Remove current user (submitter) and deduplicate
        $notifyUserIds = $notifyUserIds->unique()->reject(fn ($id) => $id === Auth::id());

        $submitterName = Auth::user()->full_name ?? 'Басқарма';
        $docCount = count($request->file('documents', []));
        $photoCount = count($request->file('photos', []));
        $fileInfo = [];
        if ($docCount > 0) $fileInfo[] = "{$docCount} документ";
        if ($photoCount > 0) $fileInfo[] = "{$photoCount} фото";
        $fileStr = count($fileInfo) > 0 ? ' (' . implode(', ', $fileInfo) . ')' : '';

        foreach ($notifyUserIds as $userId) {
            TaskNotification::create([
                'user_id' => $userId,
                'task_id' => $task->id,
                'completion_id' => $completion->id,
                'type' => 'completion_submitted',
                'message' => "{$submitterName} выполнил задание: \"{$task->title}\"{$fileStr}. Проверить.",
            ]);
        }

        return redirect()->back()->with('success', 'Задание выполнено и отправлено.');
    }

    /**
     * Исполнитель reviews a completion: approve or reject.
     */
    public function review(Request $request, InvestmentProject $investmentProject, ProjectTask $task, TaskCompletion $completion)
    {
        if ($task->project_id !== $investmentProject->id) {
            abort(404);
        }

        if ($completion->task_id !== $task->id) {
            abort(404);
        }

        $request->validate([
            'status' => 'required|in:approved,rejected',
            'reviewer_comment' => 'nullable|string|max:2000',
        ]);

        $completion->update([
            'status' => $request->input('status'),
            'reviewer_comment' => $request->input('reviewer_comment'),
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        $reviewerName = Auth::user()->full_name ?? 'Исполнитель';

        if ($request->input('status') === 'approved') {
            $task->update(['status' => 'done']);
            $notificationType = 'completion_approved';
            $message = "{$reviewerName} принял задание: \"{$task->title}\".";
        } else {
            $task->update(['status' => 'rejected']);
            $notificationType = 'completion_rejected';
            $reviewerComment = $request->input('reviewer_comment');
            $commentStr = $reviewerComment ? " Причина: {$reviewerComment}" : '';
            $message = "{$reviewerName} отклонил задание: \"{$task->title}\". Повторите выполнение.{$commentStr}";
        }

        // Notify the baskarma who submitted the completion
        if ($completion->submitted_by !== Auth::id()) {
            TaskNotification::create([
                'user_id' => $completion->submitted_by,
                'task_id' => $task->id,
                'completion_id' => $completion->id,
                'type' => $notificationType,
                'message' => $message,
            ]);
        }

        return redirect()->back()->with('success', 'Результат проверки сохранен.');
    }
}
