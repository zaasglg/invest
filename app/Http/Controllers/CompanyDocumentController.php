<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\CompanyDocument;
use App\Services\CompanyDocumentService;
use App\Services\PrivateFileService;

class CompanyDocumentController extends Controller
{
    public function __construct(
        private readonly CompanyDocumentService $documents,
        private readonly PrivateFileService $files
    ) {}

    public function download(
        Company $company,
        CompanyDocument $companyDocument
    ) {
        $this->ensureDocumentBelongsToCompany($company, $companyDocument);

        return $this->files->download(
            $companyDocument->file_path,
            $this->files->downloadName(
                $companyDocument->name,
                $companyDocument->file_path
            )
        );
    }

    public function destroy(
        Company $company,
        CompanyDocument $companyDocument
    ) {
        $this->ensureDocumentBelongsToCompany($company, $companyDocument);
        $this->documents->delete($companyDocument);

        return redirect()
            ->back()
            ->with('success', 'Компания құжаты жойылды.');
    }

    private function ensureDocumentBelongsToCompany(
        Company $company,
        CompanyDocument $companyDocument
    ): void {
        abort_unless($companyDocument->company_id === $company->id, 404);
    }
}
