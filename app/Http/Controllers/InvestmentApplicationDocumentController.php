<?php

namespace App\Http\Controllers;

use App\Models\InvestmentApplication;
use App\Models\InvestmentApplicationDocument;
use App\Services\InvestmentApplicationAccessService;
use App\Services\PrivateFileService;
use Illuminate\Http\Request;

class InvestmentApplicationDocumentController extends Controller
{
    public function __construct(
        private readonly InvestmentApplicationAccessService $access,
        private readonly PrivateFileService $files
    ) {}

    public function download(
        Request $request,
        InvestmentApplication $investmentApplication,
        InvestmentApplicationDocument $document
    ) {
        $this->ensureDocumentBelongsToApplication(
            $investmentApplication,
            $document
        );
        $user = $request->user()->loadMissing('roleModel');
        $isOwner = (int) $investmentApplication->user_id === (int) $user->id;
        $isReviewer = $this->access->canReview($user, $investmentApplication);
        abort_unless($isOwner || $isReviewer, 403);

        return $this->files->download(
            $document->file_path,
            $this->files->downloadName($document->name, $document->file_path)
        );
    }

    private function ensureDocumentBelongsToApplication(
        InvestmentApplication $application,
        InvestmentApplicationDocument $document
    ): void {
        abort_unless(
            (int) $document->investment_application_id === (int) $application->id,
            404
        );
    }
}
