import { format, parseISO } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FollowUpForm } from '@/pages/leads/follow-up-form';
import { TaskForm } from '@/pages/my-day/components/task-form';
import type { TaskPerson } from '@/types';

/**
 * Add a task or a lead follow-up on the clicked date. Each tab only appears
 * when the viewer may create that record.
 */
export function QuickAddDialog({
    date,
    canAddTask,
    canAddFollowUp,
    assignableUsers,
    onClose,
    onSaved,
}: {
    date: string | null;
    canAddTask: boolean;
    canAddFollowUp: boolean;
    assignableUsers: TaskPerson[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const saved = (): void => {
        onSaved();
        onClose();
    };

    return (
        <Dialog
            open={date !== null}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Add to calendar</DialogTitle>
                    <DialogDescription>
                        {date
                            ? format(parseISO(date), 'EEEE, d MMMM yyyy')
                            : ''}
                    </DialogDescription>
                </DialogHeader>
                {date && (
                    <Tabs
                        key={date}
                        defaultValue={canAddTask ? 'task' : 'follow-up'}
                    >
                        {canAddTask && canAddFollowUp && (
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="task">Task</TabsTrigger>
                                <TabsTrigger value="follow-up">
                                    Follow-up
                                </TabsTrigger>
                            </TabsList>
                        )}
                        {canAddTask && (
                            <TabsContent value="task" className="pt-2">
                                <TaskForm
                                    task={null}
                                    today={date}
                                    assignableUsers={assignableUsers}
                                    onSaved={saved}
                                    onCancel={onClose}
                                />
                            </TabsContent>
                        )}
                        {canAddFollowUp && (
                            <TabsContent value="follow-up" className="pt-2">
                                <FollowUpForm
                                    defaultDateTime={`${date}T${format(new Date(), 'HH:mm')}`}
                                    onSaved={saved}
                                    onCancel={onClose}
                                    showNextFollowUp
                                />
                            </TabsContent>
                        )}
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
