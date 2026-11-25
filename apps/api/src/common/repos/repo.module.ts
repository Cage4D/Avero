import { Global, Module } from '@nestjs/common';
import { UserRepo } from './user.repo.js';

const repos = [UserRepo];

@Global()
@Module({
  providers: repos,
  exports: repos,
})
export class RepoModule {}
