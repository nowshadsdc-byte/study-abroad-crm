<?php

namespace App\Policies;

use App\Models\LeadFollowUp;
use App\Models\User;

class LeadFollowUpPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('leads.view');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, LeadFollowUp $leadFollowUp): bool
    {
        return $user->can('view', $leadFollowUp->lead);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('leads.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, LeadFollowUp $leadFollowUp): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, LeadFollowUp $leadFollowUp): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, LeadFollowUp $leadFollowUp): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, LeadFollowUp $leadFollowUp): bool
    {
        return false;
    }
}
