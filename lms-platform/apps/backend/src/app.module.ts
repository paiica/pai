import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard } from "@nestjs/throttler";
import configuration from "./config/configuration";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module";
import { ApplicationsModule } from "./modules/applications/applications.module";
import { ExamsModule } from "./modules/exams/exams.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthModule } from "./modules/health/health.module";
import { LearningModule } from "./modules/learning/learning.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { SiteSettingsModule } from "./modules/site-settings/site-settings.module";
import { PageBlocksModule } from "./modules/page-blocks/page-blocks.module";
import { NavigationModule } from "./modules/navigation/navigation.module";
import { PagesModule } from "./modules/pages/pages.module";
import { BlogPostsModule } from "./modules/blog-posts/blog-posts.module";
import { PrepCoursesModule } from "./modules/prep-courses/prep-courses.module";
import { PromoCodesModule } from "./modules/promo-codes/promo-codes.module";
import { OnlineToolsModule } from "./modules/online-tools/online-tools.module";
import { ExamSessionsModule } from "./modules/exam-sessions/exam-sessions.module";
import { AiModule } from "./modules/ai/ai.module";
import { MailSchedulerModule } from "./modules/mail/mail-scheduler.module";
import { AssignmentsModule } from "./modules/assignments/assignments.module";
import { AffiliateModule } from "./modules/affiliate/affiliate.module";
import { EventsModule } from "./modules/events/events.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("throttle.ttl", 60) * 1000,
          limit: config.get<number>("throttle.limit", 100),
        },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    ApplicationsModule,
    ExamsModule,
    CertificatesModule,
    PaymentsModule,
    NotificationsModule,
    HealthModule,
    LearningModule,
    UploadsModule,
    SiteSettingsModule,
    PageBlocksModule,
    NavigationModule,
    PagesModule,
    BlogPostsModule,
    PrepCoursesModule,
    PromoCodesModule,
    OnlineToolsModule,
    ExamSessionsModule,
    AiModule,
    MailSchedulerModule,
    AssignmentsModule,
    AffiliateModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
