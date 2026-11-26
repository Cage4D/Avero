import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/database/prisma.service';

export type ReadinessProbe = () => Promise<void>;

export interface ReadinessResult {
    ok: boolean;
    checks: Record<string, 'ok' | 'error'>;
}

@Injectable()
export class ReadinessService {
    private readonly probes = new Map<string, ReadinessProbe>();

    constructor(prisma: PrismaService) {
        this.register('postgres', async () => {
            await prisma.$queryRaw`SELECT 1`;
        });
    }

    register(name: string, probe: ReadinessProbe): void {
        this.probes.set(name, probe);
    }

    async check(): Promise<ReadinessResult> {
        const checks: Record<string, 'ok' | 'error'> = {};
        let ok = true;

        await Promise.all(
            [...this.probes.entries()].map(async ([name, probe]) => {
                try {
                    await probe();
                    checks[name] = 'ok';
                } catch {
                    checks[name] = 'error';
                    ok = false;
                }
            }),
        );

        return { ok, checks };
    }
}
