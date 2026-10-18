<?php

namespace App\Policies;

use App\Models\ChatConversation;
use App\Models\User;

class ChatConversationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('chat.view');
    }

    public function view(User $user, ChatConversation $chatConversation): bool
    {
        return $user->hasPermissionTo('chat.view')
            && ($chatConversation->type === 'announcement' || $chatConversation->users()->whereKey($user->id)->exists());
    }

    public function send(User $user, ChatConversation $chatConversation): bool
    {
        return $user->hasPermissionTo('chat.send')
            && $chatConversation->type === 'direct'
            && $chatConversation->users()->whereKey($user->id)->exists();
    }

    public function announce(User $user): bool
    {
        return $user->hasPermissionTo('chat.announce');
    }
}
