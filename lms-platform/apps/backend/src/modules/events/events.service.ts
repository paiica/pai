import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { RegisterEventDto } from "./dto/register-event.dto";

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // ─── Public ────────────────────────────────────────────────────────────

  async findAllPublished() {
    return this.prisma.event.findMany({
      where: { status: "published" },
      orderBy: { start_at: "asc" },
      include: { _count: { select: { registrations: { where: { status: "registered" } } } } },
    });
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({ where: { slug } });
    if (!event || event.status !== "published") throw new NotFoundException("Event not found");
    return event;
  }

  // ─── Registration (free events — no Stripe) ───────────────────────────

  async registerFree(eventId: string, dto: RegisterEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== "published") throw new NotFoundException("Event not found");
    if (Number(event.price) > 0) throw new BadRequestException("This event requires payment to register");

    if (event.capacity != null) {
      const count = await this.prisma.eventRegistration.count({
        where: { event_id: eventId, status: "registered" },
      });
      if (count >= event.capacity) throw new BadRequestException("This event is at capacity");
    }

    const registration = await this.prisma.eventRegistration.upsert({
      where: { event_id_email: { event_id: eventId, email: dto.email } },
      create: {
        event_id: eventId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address_line1: dto.address_line1,
        city: dto.city,
        state_province: dto.state_province,
        postal_code: dto.postal_code,
        country: dto.country,
        profession: dto.profession,
        job_title: dto.job_title,
        education: dto.education,
        years_experience: dto.years_experience,
        status: "registered",
      },
      update: {
        name: dto.name,
        phone: dto.phone,
        address_line1: dto.address_line1,
        city: dto.city,
        state_province: dto.state_province,
        postal_code: dto.postal_code,
        country: dto.country,
        profession: dto.profession,
        job_title: dto.job_title,
        education: dto.education,
        years_experience: dto.years_experience,
        status: "registered",
      },
    });

    await this.mail.sendEventRegistrationConfirmed({
      to: dto.email,
      name: dto.name,
      eventTitle: event.title,
      eventDate: this.formatEventDate(event.start_at, event.end_at, event.timezone),
      location: event.event_type === "in_person" ? (event.location_address ?? "In person") : "Online",
      meetingLink: event.event_type !== "in_person" ? event.meeting_link ?? undefined : undefined,
    });

    return registration;
  }

  private formatEventDate(start: Date, end: Date, timezone: string): string {
    const opts: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" };
    const startStr = start.toLocaleString("en-CA", opts);
    const sameDay = start.toDateString() === end.toDateString();
    const endStr = end.toLocaleString("en-CA", sameDay ? { timeStyle: "short" } : opts);
    return `${startStr} – ${endStr} (${timezone})`;
  }

  // ─── Admin ─────────────────────────────────────────────────────────────

  async adminFindAll() {
    return this.prisma.event.findMany({
      orderBy: { start_at: "desc" },
      include: { _count: { select: { registrations: { where: { status: "registered" } } } } },
    });
  }

  async adminFindOne(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async adminCreate(dto: CreateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new BadRequestException("An event with this slug already exists");
    return this.prisma.event.create({ data: dto as any });
  }

  async adminUpdate(id: string, dto: UpdateEventDto) {
    await this.adminFindOne(id);
    if (dto.slug) {
      const existing = await this.prisma.event.findUnique({ where: { slug: dto.slug } });
      if (existing && existing.id !== id) throw new BadRequestException("An event with this slug already exists");
    }
    return this.prisma.event.update({ where: { id }, data: dto as any });
  }

  async adminDelete(id: string) {
    await this.adminFindOne(id);
    await this.prisma.event.delete({ where: { id } });
    return { message: "Event deleted" };
  }

  async adminListRegistrations(eventId: string) {
    await this.adminFindOne(eventId);
    return this.prisma.eventRegistration.findMany({
      where: { event_id: eventId },
      orderBy: { registered_at: "desc" },
    });
  }

  async adminNotifyStudents(eventId: string) {
    const event = await this.adminFindOne(eventId);
    const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://paii.ca";
    const students = await this.prisma.user.findMany({
      where: { role: "student", is_active: true },
      include: { profile: { select: { first_name: true } } },
    });

    let sent = 0;
    for (const student of students) {
      const result = await this.mail.sendEventAnnouncement({
        to: student.email,
        firstName: student.profile?.first_name ?? "there",
        eventTitle: event.title,
        eventDate: this.formatEventDate(event.start_at, event.end_at, event.timezone),
        eventSummary: event.summary ?? event.subtitle ?? "",
        registerUrl: `${marketingUrl}/events/${event.slug}`,
      });
      if (result.sent) sent++;
    }

    return { message: `Announcement sent to ${sent}/${students.length} students`, sent, total: students.length };
  }
}
