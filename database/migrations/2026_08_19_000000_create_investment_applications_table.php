<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->updateOrInsert(
            ['name' => 'applicant'],
            [
                'display_name' => 'Өтінім беруші',
                'description' => 'Өзін-өзі тіркейтін әлеуетті инвестор',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        Schema::create('investment_applications', function (Blueprint $table) {
            $table->id();
            $table->string('application_number')->unique();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->string('zoneable_type');
            $table->unsignedBigInteger('zoneable_id');
            $table->string('status', 40)->default('draft');

            $table->string('project_name');
            $table->text('project_description');
            $table->string('activity_sector');
            $table->decimal('requested_area', 12, 2);
            $table->decimal('approved_area', 12, 2)->nullable();
            $table->decimal('investment_amount', 18, 2);
            $table->unsignedInteger('jobs_count')->default(0);
            $table->json('infrastructure_requirements')->nullable();

            $table->string('company_legal_form', 30);
            $table->string('company_name');
            $table->string('company_bin', 12);
            $table->date('company_registration_date');
            $table->foreignId('company_region_id')
                ->constrained('regions')
                ->restrictOnDelete();
            $table->string('director_full_name');
            $table->string('contact_person')->nullable();
            $table->string('contact_phone', 30);
            $table->string('contact_email');
            $table->text('legal_address');

            $table->foreignId('reviewed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->text('reviewer_comment')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('reserved_until')->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->foreignId('investment_project_id')
                ->nullable()
                ->constrained('investment_projects')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['zoneable_type', 'zoneable_id', 'status']);
            $table->index(['user_id', 'status']);
            $table->index(['status', 'reserved_until']);
            $table->index(['company_bin', 'status']);
        });

        Schema::create('investment_application_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_application_id')
                ->constrained('investment_applications')
                ->cascadeOnDelete();
            $table->string('name');
            $table->string('file_path');
            $table->string('type', 20)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('investment_application_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_application_id')
                ->constrained('investment_applications')
                ->cascadeOnDelete();
            $table->string('from_status', 40)->nullable();
            $table->string('to_status', 40);
            $table->foreignId('changed_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->text('comment')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['investment_application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_application_status_histories');
        Schema::dropIfExists('investment_application_documents');
        Schema::dropIfExists('investment_applications');

        $applicantRoleId = DB::table('roles')
            ->where('name', 'applicant')
            ->value('id');

        if ($applicantRoleId !== null
            && ! DB::table('users')->where('role_id', $applicantRoleId)->exists()) {
            DB::table('roles')->where('id', $applicantRoleId)->delete();
        }
    }
};
