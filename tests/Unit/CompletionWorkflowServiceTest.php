<?php

use App\Models\ProjectTask;
use App\Models\User;
use App\Services\CompletionWorkflowService;
use App\Services\PrivateFileService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

uses(TestCase::class);

test('project completion workflow rejects a submission without documents', function () {
    $service = new CompletionWorkflowService(new PrivateFileService);

    try {
        $service->submitProject(
            new ProjectTask,
            new User,
            null,
            [],
            []
        );
    } catch (ValidationException $exception) {
        expect($exception->errors())->toBe([
            'documents' => [
                CompletionWorkflowService::PROJECT_DOCUMENT_REQUIRED_MESSAGE,
            ],
        ]);

        return;
    }

    throw new RuntimeException('Expected document validation to fail.');
});
