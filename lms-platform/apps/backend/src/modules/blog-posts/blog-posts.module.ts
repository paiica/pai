import { Module } from "@nestjs/common";
import { BlogPostsController } from "./blog-posts.controller";
import { BlogPostsService } from "./blog-posts.service";
import { PrismaModule } from "../prisma/prisma.module";
import { TranslationsModule } from "../translations/translations.module";

@Module({
  imports: [PrismaModule, TranslationsModule],
  controllers: [BlogPostsController],
  providers: [BlogPostsService],
})
export class BlogPostsModule {}
