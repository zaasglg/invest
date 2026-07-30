<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->string('legal_form', 30)->default('other');
            $table->string('name');
            $table->string('bin', 12)->nullable()->unique();
            $table->date('registration_date')->nullable();
            $table->foreignId('region_id')
                ->nullable()
                ->constrained('regions')
                ->nullOnDelete();
            $table->string('activity_type')->nullable();
            $table->string('director_full_name')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->text('legal_address')->nullable();
            $table->text('actual_address')->nullable();
            $table->string('status', 30)->default('active');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'name']);
            $table->index(['region_id', 'status']);
        });

        Schema::table('investment_projects', function (Blueprint $table) {
            $table->foreignId('company_id')
                ->nullable()
                ->after('company_name')
                ->constrained('companies')
                ->restrictOnDelete();
        });

        $companyIdsByName = [];
        $legacyCompanyNames = DB::table('investment_projects')
            ->whereNotNull('company_name')
            ->where('company_name', '<>', '')
            ->select('company_name')
            ->distinct()
            ->orderBy('company_name')
            ->pluck('company_name');

        foreach ($legacyCompanyNames as $legacyCompanyName) {
            $name = trim((string) $legacyCompanyName);
            $normalizedName = mb_strtolower(
                preg_replace('/\s+/u', ' ', $name) ?? $name
            );

            if (! isset($companyIdsByName[$normalizedName])) {
                $companyIdsByName[$normalizedName] = DB::table('companies')
                    ->insertGetId([
                        'legal_form' => 'other',
                        'name' => $name,
                        'status' => 'active',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            DB::table('investment_projects')
                ->where('company_name', $legacyCompanyName)
                ->update([
                    'company_id' => $companyIdsByName[$normalizedName],
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });

        Schema::dropIfExists('companies');
    }
};
