import Note from "../models/note.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";

export const getNotes = asyncHandler(async (req, res) => {
  const { lead, contact, search } = req.query;
  const filter = { ownerId: req.user.id };

  if (lead) filter.leadId = parseInt(lead);
  if (contact) filter.contactId = parseInt(contact);
  if (search) {
    filter.content = { contains: search, mode: "insensitive" };
  }

  const notes = await Note.findMany({
    where: filter,
    include: {
      lead: { select: { name: true, company: true } },
      contact: { select: { name: true, company: true } },
    },
    orderBy: [
      { pinned: "desc" },
      { createdAt: "desc" },
    ],
  });

  res.status(200).json({ success: true, count: notes.length, data: notes });
});

export const createNote = asyncHandler(async (req, res) => {
  const { content, lead, contact, pinned } = req.body;
  
  if (!content) throw new ApiError(400, "Content is required");

  const note = await Note.create({
    data: {
      content,
      leadId: lead ? parseInt(lead) : null,
      contactId: contact ? parseInt(contact) : null,
      pinned: Boolean(pinned),
      ownerId: req.user.id,
    },
    include: {
      lead: { select: { name: true, company: true } },
      contact: { select: { name: true, company: true } },
    },
  });

  res.status(201).json({ success: true, data: note });
});

export const updateNote = asyncHandler(async (req, res) => {
  const { owner, ownerId, id, ...updates } = req.body;
  
  // Map lead/contact updates to leadId/contactId respectively
  if (updates.lead !== undefined) {
    updates.leadId = updates.lead ? parseInt(updates.lead) : null;
    delete updates.lead;
  }
  if (updates.contact !== undefined) {
    updates.contactId = updates.contact ? parseInt(updates.contact) : null;
    delete updates.contact;
  }
  
  const existingNote = await Note.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id },
  });

  if (!existingNote) throw new ApiError(404, "Note not found");

  const note = await Note.update({
    where: { id: parseInt(req.params.id) },
    data: updates,
    include: {
      lead: { select: { name: true, company: true } },
      contact: { select: { name: true, company: true } },
    },
  });

  res.status(200).json({ success: true, data: note });
});

export const deleteNote = asyncHandler(async (req, res) => {
  const existingNote = await Note.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id },
  });

  if (!existingNote) throw new ApiError(404, "Note not found");

  await Note.delete({
    where: { id: parseInt(req.params.id) },
  });

  res.status(200).json({ success: true, message: "Note removed" });
});
