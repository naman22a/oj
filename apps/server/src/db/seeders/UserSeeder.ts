import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';
import argon2 from 'argon2';
import { User } from '../../models/user.model.ts';

export class UserSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const adminPassword = process.env.ADMIN_PASSWORD!;
        if (!adminPassword) {
            throw new Error(
                'ADMIN_PASSWORD must be set before running database seeds'
            );
        }

        const users = [
            {
                username: 'admin',
                email: 'admin@gmail.com',
                passwordHash: await argon2.hash(adminPassword),
                emailVerified: true,
                isAdmin: true,
                fullName: 'Admin'
            },
            {
                username: 'test',
                email: 'test@gmail.com',
                passwordHash: await argon2.hash('test123'),
                emailVerified: true,
                isAdmin: false,
                fullName: 'Test'
            }
        ];

        for (const user of users) {
            await em.upsert(User, user, {
                onConflictFields: ['email'],
                onConflictAction: 'ignore'
            });
        }

        console.log('Seeded admin and test users');
    }
}
