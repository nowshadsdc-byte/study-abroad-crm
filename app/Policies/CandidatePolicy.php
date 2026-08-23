<?php

namespace App\Policies;

use App\Models\Candidate;
use App\Models\User;

class CandidatePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('candidate.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.view');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('candidate.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.delete');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Candidate $candidate): bool
    {
        return $this->delete($user, $candidate);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Candidate $candidate): bool
    {
        return $user->hasRole('Administrator');
    }

    public function updateProgress(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }

    public function createDocument(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }

    public function verifyDocument(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }

    public function createApplication(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }

    public function updateApplication(User $user, Candidate $candidate): bool
    {
        return $user->hasPermissionTo('candidate.edit');
    }
}
