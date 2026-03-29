import { Link } from '@/core/i18n/navigation';
import { getUserInfo } from '@/shared/models/user';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getDownloadManifest } from '@/shared/services/downloads';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';

export default async function DownloadsPage() {
  const user = await getUserInfo();
  const subscription = user ? await getCurrentSubscription(user.id) : null;
  const { manifest } = await getDownloadManifest();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Download Harvey Desktop</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Version {manifest.version}
            {manifest.publishedAt ? ` · Published ${new Date(manifest.publishedAt).toLocaleDateString()}` : ''}
          </p>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground">Current plan</div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <Badge>{subscription?.planName || 'Free'}</Badge>
            <Link href="/pricing">
              <Button size="sm" variant="outline">
                Upgrade
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {manifest.artifacts.map((artifact) => (
          <Card key={`${artifact.platform}-${artifact.arch}`}>
            <CardHeader>
              <CardTitle className="text-base">
                {artifact.platform.toUpperCase()} · {artifact.arch}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <a
                href={artifact.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button className="w-full">Download</Button>
              </a>
              {artifact.checksum ? (
                <p className="break-all text-xs text-muted-foreground">
                  SHA256: {artifact.checksum}
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
