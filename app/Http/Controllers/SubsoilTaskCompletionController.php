<?php

namespace App\Http\Controllers;

use App\Models\SubsoilDocument;
use App\Models\SubsoilTask;
use App\Models\SubsoilTaskCompletion;
use App\Models\SubsoilTaskCompletionFile;
use App\Models\SubsoilUser;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class SubsoilTaskCompletionController extends Controller
{
    public function store(Request $request, SubsoilUser $subsoilUser, SubsoilTask $task)
    {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);

        $request->validate([
            'comment' => 'nullable|string|max:2000',
            'documents' => 'nullable|array|max:10',
            'documents.*' => 'file|max:20480',
            'photos' => 'nullable|array|max:10',
            'photos.*' => 'image|max:20480',
        ]);

        $completion = SubsoilTaskCompletion::create([
            'task_id' => $task->id,
            'submitted_by' => Auth::id(),
            'comment' => $request->input('comment'),
            'status' => 'pending',
        ]);

        if ($request->hasFile('documents')) {
            foreach ($request->file('documents') as $file) {
                $path = $file->store('subsoil-task-completions', 'public');
                SubsoilTaskCompletionFile::create([
                    'completion_id' => $completion->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => 'document',
                ]);
            }
        }

        if ($request->hasFile('photos')) {
            foreach ($request->file('photos') as $file) {
                $path = $file->store('subsoil-task-completions', 'public');
                SubsoilTaskCompletionFile::create([
                    'completion_id' => $completion->id,
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => 'photo',
                ]);
            }
        }

        $task->update(['status' => 'in_progress']);

        $notifyUserIds = collect();

        if ($task->created_by) {
            $notifyUserIds->push($task->created_by);
        }

        $superadminIds = User::whereHas('roleModel', fn ($q) => $q->where('name', 'superadmin'))->pluck('id');
        $notifyUserIds = $notifyUserIds->merge($superadminIds);

        $notifyUserIds = $notifyUserIds->unique()->reject(fn ($id) => $id === Auth::id());

        $submitterName = Auth::user()->full_name ?? 'Исполнитель';
        $docCount = count($request->file('documents', []));
        $photoCount = count($request->file('photos', []));
        $fileInfo = [];
        if ($docCount > 0) {
            $fileInfo[] = "{$docCount} құжат";
        }
        if ($photoCount > 0) {
            $fileInfo[] = "{$photoCount} фото";
        }
        $fileStr = count($fileInfo) > 0 ? ' ('.implode(', ', $fileInfo).')' : '';

        foreach ($notifyUserIds as $userId) {
            TaskNotification::create([
                'user_id' => $userId,
                'subsoil_task_id' => $task->id,
                'subsoil_completion_id' => $completion->id,
                'type' => 'completion_submitted',
                'message' => "{$submitterName} тапсырманы орындады: \"{$task->title}\"{$fileStr}. Тексеру.",
            ]);
        }

        return redirect()->back()->with('success', 'Тапсырма орындалды және жіберілді.');
    }

    public function review(Request $request, SubsoilUser $subsoilUser, SubsoilTask $task, SubsoilTaskCompletion $completion)
    {
        abort_if($task->subsoil_user_id !== $subsoilUser->id, 404);
        abort_if($completion->task_id !== $task->id, 404);

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

        $reviewerName = Auth::user()->full_name ?? 'Орындаушы';

        if ($request->input('status') === 'approved') {
            $task->update(['status' => 'done']);
            $notificationType = 'completion_approved';
            $message = "{$reviewerName} тапсырманы қабылдады: \"{$task->title}\".";

            $this->copyCompletionDocumentsToSubsoil($completion, $subsoilUser, $task);
        } else {
            $task->update(['status' => 'rejected']);
            $notificationType = 'completion_rejected';
            $reviewerComment = $request->input('reviewer_comment');
            $commentStr = $reviewerComment ? " Себебі: {$reviewerComment}" : '';
            $message = "{$reviewerName} тапсырманы қабылдамады: \"{$task->title}\". Қайта орындаңыз.{$commentStr}";
        }

        if ($completion->submitted_by !== Auth::id()) {
            TaskNotification::create([
                'user_id' => $completion->submitted_by,
                'subsoil_task_id' => $task->id,
                'subsoil_completion_id' => $completion->id,
                'type' => $notificationType,
                'message' => $message,
            ]);
        }

        return redirect()->back()->with('success', 'Тексеру нәтижесі сақталды.');
    }

    protected function copyCompletionDocumentsToSubsoil(SubsoilTaskCompletion $completion, SubsoilUser $subsoilUser, SubsoilTask $task): void
    {
        $documentFiles = $completion->files()->where('type', 'document')->get();

        foreach ($documentFiles as $file) {
            if (! Storage::disk('public')->exists($file->file_path)) {
                continue;
            }

            $extension = pathinfo($file->file_name, PATHINFO_EXTENSION);
            $newFileName = pathinfo($file->file_name, PATHINFO_FILENAME)
                .'_'.time().'.'.$extension;
            $newPath = 'subsoil-documents/'.$subsoilUser->id.'/'.$newFileName;

            Storage::disk('public')->copy($file->file_path, $newPath);

            SubsoilDocument::create([
                'subsoil_user_id' => $subsoilUser->id,
                'name' => $file->file_name.' (Тапсырма: '.$task->title.')',
                'file_path' => $newPath,
                'type' => $extension ?: 'document',
                'is_completed' => true,
            ]);
        }
    }
}
