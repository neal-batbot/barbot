import { getTranslations } from 'next-intl/server';
import { revalidatePath } from 'next/cache';

import { Empty } from '@/shared/blocks/common';
import { FormCard } from '@/shared/blocks/form';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  listDesktopSessionsForUser,
  revokeDesktopSessionById,
} from '@/shared/models/desktop-auth';
import { getUserInfo, UpdateUser, updateUser } from '@/shared/models/user';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function ProfilePage() {
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.profile');
  const desktopSessions = await listDesktopSessionsForUser(user.id);

  async function revokeDesktopSessionAction(formData: FormData) {
    'use server';

    const currentUser = await getUserInfo();
    if (!currentUser) {
      throw new Error('no auth');
    }

    const sessionId = formData.get('sessionId');
    if (typeof sessionId !== 'string' || !sessionId) {
      throw new Error('session id is required');
    }

    await revokeDesktopSessionById(currentUser.id, sessionId);
    revalidatePath('/settings/profile');
  }

  const form: FormType = {
    fields: [
      {
        name: 'email',
        title: t('fields.email'),
        type: 'email',
        attributes: { disabled: true },
      },
      { name: 'name', title: t('fields.name'), type: 'text' },
      {
        name: 'image',
        title: t('fields.avatar'),
        type: 'upload_image',
        metadata: {
          max: 1,
        },
      },
    ],
    data: user,
    passby: {
      user: user,
    },
    submit: {
      handler: async (data: FormData, passby: any) => {
        'use server';

        const { user } = passby;
        if (!user) {
          throw new Error('no auth');
        }

        const name = data.get('name') as string;
        if (!name?.trim()) {
          throw new Error('name is required');
        }

        const image = data.get('image');
        console.log('image', image, typeof image);

        const updatedUser: UpdateUser = {
          name: name.trim(),
          image: image as string,
        };

        await updateUser(user.id, updatedUser);

        return {
          status: 'success',
          message: 'Profile updated',
          redirect_url: '/settings/profile',
        };
      },
      button: {
        title: t('edit.buttons.submit'),
      },
    },
  };

  return (
    <div className="space-y-8">
      <FormCard
        title={t('edit.title')}
        description={t('edit.description')}
        form={form}
        className="max-w-4xl"
      />

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>{t('desktop.title')}</CardTitle>
          <CardDescription>{t('desktop.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {desktopSessions.length > 0 ? (
            <div className="divide-y divide-fd-border">
              {desktopSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium">
                      {session.deviceInfo || t('desktop.defaultDevice')}
                    </div>
                    <div className="text-sm text-fd-muted-foreground">
                      {t('desktop.createdAt', {
                        date: session.createdAt.toLocaleDateString(),
                      })}
                      {' · '}
                      {t('desktop.expiresAt', {
                        date: session.expiresAt.toLocaleDateString(),
                      })}
                    </div>
                  </div>
                  <form action={revokeDesktopSessionAction}>
                    <input type="hidden" name="sessionId" value={session.id} />
                    <Button type="submit" variant="outline" size="sm">
                      {t('desktop.revoke')}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-fd-border px-4 py-6 text-sm text-fd-muted-foreground">
              {t('desktop.empty')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
