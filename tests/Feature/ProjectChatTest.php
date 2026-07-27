<?php

use App\Models\InvestmentProject;
use App\Models\ProjectChatAttachment;
use App\Models\ProjectChatMessage;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function createProjectChatUser(string $roleName, string $fullName): User
{
    $role = Role::firstOrCreate(
        ['name' => $roleName],
        [
            'display_name' => ucfirst($roleName),
            'description' => "{$roleName} project chat test role",
        ]
    );

    return User::factory()->create([
        'full_name' => $fullName,
        'role' => $roleName === 'superadmin' ? 'admin' : 'district_user',
        'role_id' => $role->id,
    ]);
}

function createProjectChatProject(User $creator): InvestmentProject
{
    $region = Region::create([
        'name' => 'Чат тест ауданы',
        'type' => 'district',
        'color' => '#3B82F6',
        'icon' => 'factory',
    ]);

    return InvestmentProject::create([
        'name' => 'Тест топтық чат жобасы',
        'company_name' => 'Chat Test Company',
        'region_id' => $region->id,
        'total_investment' => 1000000,
        'status' => 'implementation',
        'created_by' => $creator->id,
    ]);
}

test('project participant can open an empty project chat directly', function () {
    $curator = createProjectChatUser('invest', 'Жоба Кураторы');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);

    $this->actingAs($curator)
        ->get("/chats/{$project->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('chats/index')
            ->has('chats', 0)
            ->where('selectedChat.id', $project->id)
            ->where('selectedChat.name', $project->name)
            ->has('selectedChat.messages', 0)
            ->where('selectedChat.participant_count', 1)
            ->where(
                'selectedChat.participants.0.project_roles.0',
                'Жоба кураторы'
            ));
});

test('empty project chat is hidden until its first message is sent', function () {
    $curator = createProjectChatUser('invest', 'Жауапты Куратор');
    $executor = createProjectChatUser('ispolnitel', 'Жоба Орындаушысы');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);
    $project->executors()->attach($executor);

    $this->actingAs($executor)
        ->get('/chats')
        ->assertInertia(fn (Assert $page) => $page
            ->component('chats/index')
            ->has('chats', 0)
            ->where('selectedChat', null));

    $this->actingAs($curator)
        ->post("/chats/{$project->id}/messages", [
            'message' => 'Бірінші жоба хабарламасы',
        ])
        ->assertRedirect("/chats/{$project->id}");

    $this->assertDatabaseHas('project_chat_messages', [
        'investment_project_id' => $project->id,
        'user_id' => $curator->id,
        'message' => 'Бірінші жоба хабарламасы',
    ]);

    $this->actingAs($executor)
        ->get('/chats/unread-count')
        ->assertOk()
        ->assertJson(['count' => 1]);

    $this->actingAs($executor)
        ->get('/chats')
        ->assertInertia(fn (Assert $page) => $page
            ->component('chats/index')
            ->has('chats', 1)
            ->where('chats.0.id', $project->id)
            ->where(
                'chats.0.last_message.message',
                'Бірінші жоба хабарламасы'
            )
            ->where('selectedChat.id', $project->id));
});

test('opening a project chat marks its messages as read', function () {
    $curator = createProjectChatUser('invest', 'Оқитын Куратор');
    $investor = createProjectChatUser('investor', 'Тест Инвесторы');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);
    $project->investors()->attach($investor);

    ProjectChatMessage::create([
        'investment_project_id' => $project->id,
        'user_id' => $curator->id,
        'message' => 'Инвесторға арналған хабарлама',
    ]);

    $this->actingAs($investor)
        ->get('/chats/unread-count')
        ->assertJson(['count' => 1]);

    $this->actingAs($investor)
        ->get("/chats/{$project->id}")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('selectedChat.messages.0.message', 'Инвесторға арналған хабарлама')
            ->where(
                'selectedChat.participants.1.project_roles.0',
                'Жоба инвесторы'
            ));

    $this->assertDatabaseHas('project_chat_reads', [
        'investment_project_id' => $project->id,
        'user_id' => $investor->id,
    ]);

    $this->actingAs($investor)
        ->get('/chats/unread-count')
        ->assertJson(['count' => 0]);
});

test('users outside project participants cannot read or write its chat', function () {
    $curator = createProjectChatUser('invest', 'Негізгі Куратор');
    $outsider = createProjectChatUser('superadmin', 'Бөтен Әкімші');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);

    $this->actingAs($outsider)
        ->get("/chats/{$project->id}")
        ->assertForbidden();

    $this->actingAs($outsider)
        ->post("/chats/{$project->id}/messages", [
            'message' => 'Рұқсатсыз хабарлама',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('project_chat_messages', [
        'investment_project_id' => $project->id,
        'user_id' => $outsider->id,
    ]);
});

test('participants can exchange protected images and documents', function () {
    Storage::fake('local');

    $curator = createProjectChatUser('invest', 'Файл Кураторы');
    $executor = createProjectChatUser('ispolnitel', 'Файл Орындаушысы');
    $outsider = createProjectChatUser('superadmin', 'Файлға Бөтен Адам');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);
    $project->executors()->attach($executor);

    $this->actingAs($curator)
        ->post("/chats/{$project->id}/messages", [
            'message' => '',
            'files' => [
                UploadedFile::fake()->createWithContent(
                    'құрылыс.png',
                    base64_decode(
                        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC'
                        .'AAAAC0lEQVR42mP8/x8AAusB9Y9WlN8AAAAASUVORK5CYII='
                    )
                ),
                UploadedFile::fake()->create(
                    'есеп.pdf',
                    250,
                    'application/pdf'
                ),
            ],
        ])
        ->assertRedirect("/chats/{$project->id}");

    $message = ProjectChatMessage::where(
        'investment_project_id',
        $project->id
    )->firstOrFail();
    $attachments = ProjectChatAttachment::where(
        'project_chat_message_id',
        $message->id
    )->get();

    expect($message->message)->toBe('')
        ->and($attachments)->toHaveCount(2);

    foreach ($attachments as $attachment) {
        Storage::disk('local')->assertExists($attachment->file_path);
    }

    $this->actingAs($executor)
        ->get("/chats/{$project->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->has('selectedChat.messages.0.attachments', 2)
            ->where(
                'selectedChat.messages.0.attachments.0.original_name',
                'құрылыс.png'
            ));

    $image = $attachments->first(
        fn (ProjectChatAttachment $attachment) => str_starts_with(
            $attachment->mime_type ?? '',
            'image/'
        )
    );
    $document = $attachments->first(
        fn (ProjectChatAttachment $attachment) => ! str_starts_with(
            $attachment->mime_type ?? '',
            'image/'
        )
    );

    $this->actingAs($executor)
        ->get("/chats/attachments/{$image->id}/preview")
        ->assertOk();

    $this->actingAs($executor)
        ->get("/chats/attachments/{$document->id}")
        ->assertOk();

    $this->actingAs($outsider)
        ->get("/chats/attachments/{$document->id}")
        ->assertForbidden();

    $this->actingAs($outsider)
        ->get("/chats/attachments/{$image->id}/preview")
        ->assertForbidden();
});

test('project page exposes chat access only to project participants', function () {
    $curator = createProjectChatUser('invest', 'Карточка Кураторы');
    $outsider = createProjectChatUser('superadmin', 'Карточка Әкімшісі');
    $project = createProjectChatProject($curator);
    $project->curators()->attach($curator);

    $this->actingAs($curator)
        ->get("/investment-projects/{$project->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('canAccessChat', true));

    $this->actingAs($outsider)
        ->get("/investment-projects/{$project->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('investment-projects/show')
            ->where('canAccessChat', false));
});
