<?php

namespace App\Console\Commands;

use App\Models\ProjectDocument;
use App\Models\SubsoilDocument;
use App\Models\SubsoilTaskCompletionFile;
use App\Models\TaskCompletionFile;
use App\Services\PrivateFileService;
use Illuminate\Console\Command;
use Throwable;

class MigratePrivateDocuments extends Command
{
    protected $signature = 'documents:migrate-private {--dry-run : Report changes without moving files}';

    protected $description = 'Move CRM documents from public storage to private storage';

    public function handle(PrivateFileService $files): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $counts = [
            'would_move' => 0,
            'would_remove_duplicate' => 0,
            'moved' => 0,
            'removed_duplicate' => 0,
            'private' => 0,
            'missing' => 0,
            'failed' => 0,
        ];

        $models = [
            ProjectDocument::class,
            SubsoilDocument::class,
            TaskCompletionFile::class,
            SubsoilTaskCompletionFile::class,
        ];

        foreach ($models as $model) {
            $model::query()
                ->select(['id', 'file_path'])
                ->chunkById(200, function ($records) use (
                    &$counts,
                    $dryRun,
                    $files,
                    $model
                ): void {
                    foreach ($records as $record) {
                        try {
                            $status = $files->migrateFromPublic(
                                $record->file_path,
                                $dryRun
                            );
                            $counts[$status]++;
                        } catch (Throwable $exception) {
                            $counts['failed']++;
                            report($exception);
                            $this->error(
                                "{$model} #{$record->id}: {$exception->getMessage()}"
                            );
                        }
                    }
                });
        }

        $this->table(
            ['Status', 'Count'],
            collect($counts)
                ->map(fn (int $count, string $status) => [$status, $count])
                ->values()
                ->all()
        );

        if ($counts['missing'] > 0) {
            $this->warn(
                "{$counts['missing']} database records point to missing files."
            );
        }

        return $counts['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
