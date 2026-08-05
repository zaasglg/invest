<?php

namespace App\Services;

use App\Models\Company;
use App\Models\CompanyDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class CompanyDocumentService
{
    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    /**
     * @param  array<int, UploadedFile>  $documents
     */
    public function storeMany(
        Company $company,
        array $documents,
        User $uploader
    ): void {
        $storedPaths = [];

        try {
            foreach ($documents as $document) {
                $path = $document->store(
                    'company-documents/'.$company->id,
                    'local'
                );

                if (! is_string($path)) {
                    throw new RuntimeException('Компания құжатын сақтау мүмкін болмады.');
                }

                $storedPaths[] = $path;

                CompanyDocument::create([
                    'company_id' => $company->id,
                    'name' => $this->safeOriginalName($document),
                    'file_path' => $path,
                    'type' => strtolower($document->getClientOriginalExtension()),
                    'size' => $document->getSize() ?: null,
                    'uploaded_by' => $uploader->id,
                ]);
            }
        } catch (Throwable $exception) {
            $this->deleteFiles($storedPaths);

            throw $exception;
        }
    }

    public function delete(CompanyDocument $document): void
    {
        $path = $document->file_path;

        $document->delete();
        $this->files->delete($path);
    }

    /**
     * @param  iterable<int, string>  $paths
     */
    public function deleteFiles(iterable $paths): void
    {
        foreach ($paths as $path) {
            $this->files->delete($path);
        }
    }

    private function safeOriginalName(UploadedFile $document): string
    {
        $name = str_replace('\\', '/', $document->getClientOriginalName());
        $name = basename($name);
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';

        return Str::limit($name !== '' ? $name : 'document', 255, '');
    }
}
