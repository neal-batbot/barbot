import { setRequestLocale } from 'next-intl/server';

import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { getPlanEntitlements, parseFeatures } from '@/shared/models/plan-entitlement';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

export default async function PlanEntitlementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const entitlements = await getPlanEntitlements();

  // Group by plan name
  const grouped = entitlements.reduce<Record<string, typeof entitlements>>((acc, e) => {
    if (!acc[e.planName]) acc[e.planName] = [];
    acc[e.planName].push(e);
    return acc;
  }, {});

  return (
    <>
      <Header />
      <Main>
        <MainHeader
          title="Plan Entitlements"
          description="Configure which plans can access which products and features"
        />

        {Object.keys(grouped).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No entitlements configured. Run: npx tsx scripts/seed-products.ts
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([planName, items]) => (
            <Card key={planName} className="mb-4">
              <CardHeader>
                <CardTitle className="text-base">{planName}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Quota Tokens</TableHead>
                      <TableHead>Quota Requests</TableHead>
                      <TableHead>Device Limit</TableHead>
                      <TableHead>Features</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((e) => {
                      const features = parseFeatures(e.features);
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-mono text-sm">{e.productCode}</TableCell>
                          <TableCell>
                            <Badge variant={e.isEnabled ? 'default' : 'secondary'}>
                              {e.isEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.quotaTokens?.toLocaleString() ?? '∞'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {e.quotaRequests?.toLocaleString() ?? '∞'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(features.device_limit as number) ?? 3}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {e.features ?? '{}'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Seed Default Entitlements</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded p-3 text-xs font-mono">
              npx tsx scripts/seed-products.ts
            </pre>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
