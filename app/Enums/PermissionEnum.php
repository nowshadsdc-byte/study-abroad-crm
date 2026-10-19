<?php

namespace App\Enums;

enum PermissionEnum: string
{
    case DashboardView = 'dashboard.view';
    case LeadView = 'lead.view';
    case LeadCreate = 'lead.create';
    case LeadEdit = 'lead.edit';
    case LeadDelete = 'lead.delete';
    case CandidateView = 'candidate.view';
    case CandidateCreate = 'candidate.create';
    case CandidateEdit = 'candidate.edit';
    case CandidateDelete = 'candidate.delete';
    case FinanceView = 'finance.view';
    case FinanceCreate = 'finance.create';
    case FinanceEdit = 'finance.edit';
    case FinanceDelete = 'finance.delete';
    case OpportunityView = 'opportunity.view';
    case OpportunityCreate = 'opportunity.create';
    case OpportunityEdit = 'opportunity.edit';
    case OpportunityDelete = 'opportunity.delete';
    case SettingsAccess = 'settings.access';
    case TaskView = 'task.view';
    case TaskCreate = 'task.create';
    case TaskEditAny = 'task.edit_any';
    case TaskDeleteAny = 'task.delete_any';
    case ChatView = 'chat.view';
    case ChatSend = 'chat.send';
    case ChatAnnounce = 'chat.announce';
    case ReportView = 'report.view';
}
