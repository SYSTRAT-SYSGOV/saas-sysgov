<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\UserInvitation;
use App\Models\Role;
use App\Models\Tenant;
use App\Services\InvitationService;
use App\Support\AuditLogger;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Modules\Admin\Http\Requests\InviteUserRequest;
use Modules\Admin\Http\Resources\InvitationResource;

final class InvitationAdminController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly InvitationService $invitationService,
        private readonly AuditLogger $audit
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', UserInvitation::class);

        $invitations = $this->invitationService->listPending();

        return InvitationResource::collection($invitations)->response();
    }

    public function store(InviteUserRequest $request): JsonResponse
    {
        $this->authorize('create', UserInvitation::class);

        $role = Role::where('slug', $request->role_slug)->firstOrFail();
        $tenant = $request->tenant_id ? Tenant::findOrFail($request->tenant_id) : null;

        $invitation = $this->invitationService->invite(
            $request->email,
            $role,
            $tenant,
            $request->user()
        );

        return (new InvitationResource($invitation))->response()->setStatusCode(201);
    }

    public function resend(UserInvitation $invitation): JsonResponse
    {
        $this->authorize('resend', $invitation);

        $invitation = $this->invitationService->resend($invitation);

        return (new InvitationResource($invitation))->response();
    }

    public function destroy(UserInvitation $invitation): JsonResponse
    {
        $this->authorize('cancel', $invitation);

        $this->invitationService->cancel($invitation);

        return response()->json(null, 204);
    }
}