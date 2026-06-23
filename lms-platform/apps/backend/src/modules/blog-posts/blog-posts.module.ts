import { Module } from "@nestjs/common";
import { BlogPostsController } from "./blog-posts.controller";
import { BlogPostsService } from "./blog-posts.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [BlogPostsController],
  providers: [BlogPostsService],
})
export class BlogPostsModule {}
