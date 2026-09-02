import "dotenv/config";
import { prisma } from "./config/db.js";
import bcrypt from "bcryptjs";

const seedData = async () => {
  try {
    console.log("Connected to PostgreSQL for seeding...");

    const email = "alex@salescrm.com"; 
    
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("test@1234", salt);

      user = await prisma.user.create({
        data: {
          name: "Alex Morgan",
          email,
          password: hashedPassword,
          company: "Acme Cloud",
          role: "owner",
        },
      });
    }

    const ownerId = user.id;

    // Clear existing data in correct relation order
    await prisma.task.deleteMany({ where: { ownerId } });
    await prisma.note.deleteMany({ where: { ownerId } });
    await prisma.lead.deleteMany({ where: { ownerId } });
    await prisma.contact.deleteMany({ where: { ownerId } });

    // Insert Contacts
    const contactData = [
      { ownerId, name: "Sarah Jenkins", email: "sarah@lumina.io", phone: "+1 555-0192", company: "Lumina Labs", title: "VP of Engineering", tags: ["Decision Maker", "Tech"], favorite: true },
      { ownerId, name: "David Kim", email: "david@vertex.co", phone: "+1 555-0144", company: "Vertex AI", title: "Head of Operations", tags: ["Champion", "Product"], favorite: true },
      { ownerId, name: "Elena Rossi", email: "elena@nova.design", phone: "+1 555-0188", company: "Nova Design", title: "Founder & CEO", tags: ["Executive", "VIP"], favorite: true },
      { ownerId, name: "Marcus Vance", email: "marcus@vanguard.io", phone: "+1 555-0201", company: "Vanguard Tech", title: "CTO", tags: ["Tech", "Enterprise"], favorite: false },
      { ownerId, name: "Chloe Dupont", email: "chloe@hyperion.fr", phone: "+33 1 42 68 55", company: "Hyperion Global", title: "Procurement Director", tags: ["Finance", "Legal"], favorite: false },
    ];
    
    const contacts = await Promise.all(contactData.map(c => prisma.contact.create({ data: c })));

    // Insert Leads (Mapped to strict Prisma enums in schema.prisma)
    const leadData = [
      { ownerId, name: "Lumina Labs Expansion", company: "Lumina Labs", email: "sarah@lumina.io", status: "Proposal", priority: "High", source: "Referral", value: 38000, order: 0 },
      { ownerId, name: "Vertex Enterprise License", company: "Vertex AI", email: "david@vertex.co", status: "Qualified", priority: "High", source: "Other", value: 52000, order: 0 },
      { ownerId, name: "Nova Platform Migration", company: "Nova Design", email: "elena@nova.design", status: "Won", priority: "Medium", source: "Website", value: 24500, order: 0 },
      { ownerId, name: "Vanguard Cloud Security Audit", company: "Vanguard Tech", email: "marcus@vanguard.io", status: "New", priority: "High", source: "ColdOutreach", value: 18000, order: 0 },
      { ownerId, name: "Hyperion EMEA Rollout", company: "Hyperion Global", email: "chloe@hyperion.fr", status: "Won", priority: "High", source: "Other", value: 95000, order: 1 },
      { ownerId, name: "Nexus Legacy Deal", company: "Nexus Soft", email: "info@nexus.com", status: "Lost", priority: "Low", source: "Website", value: 12000, order: 0 },
    ];
    
    const leads = await Promise.all(leadData.map(l => prisma.lead.create({ data: l })));

    // Insert Notes
    await prisma.note.createMany({
      data: [
        { ownerId, content: "Sarah loved the automated AI lead scoring workflow. Wants legal sign-off by Friday.", leadId: leads[0].id, contactId: contacts[0].id, pinned: true },
        { ownerId, content: "Discussed custom SLA terms with David. Proposal revision required.", leadId: leads[1].id, contactId: contacts[1].id, pinned: true },
        { ownerId, content: "Onboarding kick-off call scheduled for Elena's team next Monday morning.", leadId: leads[2].id, contactId: contacts[2].id, pinned: false },
      ]
    });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Insert Tasks
    await prisma.task.createMany({
      data: [
        { ownerId, title: "Send revised security proposal", description: "Incorporate SOC2 compliance annex", dueDate: tomorrow, status: "Pending", priority: "High", relatedLeadId: leads[0].id, relatedContactId: contacts[0].id },
        { ownerId, title: "Overdue pricing review with legal", description: "Validate enterprise multi-tenant discount", dueDate: yesterday, status: "Pending", priority: "High", relatedLeadId: leads[1].id, relatedContactId: contacts[1].id },
        { ownerId, title: "Send welcome onboarding package", description: "Send API docs and invite team members", dueDate: today, status: "Completed", priority: "Medium", relatedLeadId: leads[2].id, completedAt: today },
      ]
    });

    console.log("Seeding completed successfully!");
    console.log(`Demo Credentials -> Email: ${email} | Password: test@1234`);
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedData();
