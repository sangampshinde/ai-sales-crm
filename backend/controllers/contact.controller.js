import Contact from "../models/contact.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { invalidateUserCache } from "../config/redis.js";


export const getContacts = asyncHandler(async (req, res) => {
  const { search, tag } = req.query;
  const filter = { ownerId: req.user.id };

  if (tag) {
    filter.tags = { has: tag };
  }

  if (search) {
    filter.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const contacts = await Contact.findMany({
    where: filter,
    orderBy: [
      { favorite: "desc" },
      { name: "asc" },
    ],
  });

  res.status(200).json({ success: true, count: contacts.length, data: contacts });
});

export const getContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id }
  });
  
  if (!contact) throw new ApiError(404, "Contact not found");
  
  res.status(200).json({ success: true, data: contact });
});

export const createContact = asyncHandler(async (req, res) => {
  const contact = await Contact.create({
    data: {
      ...req.body,
      ownerId: req.user.id
    }
  });
  
  await invalidateUserCache(req.user.id);
  res.status(201).json({ success: true, data: contact });
});

export const updateContact = asyncHandler(async (req, res) => {
  const { owner, ownerId, id, ...updates } = req.body;
  
  const existingContact = await Contact.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id }
  });
  
  if (!existingContact) throw new ApiError(404, "Contact not found");

  const contact = await Contact.update({
    where: { id: parseInt(req.params.id) },
    data: updates
  });
  
  await invalidateUserCache(req.user.id);
  res.status(200).json({ success: true, data: contact });
});

export const deleteContact = asyncHandler(async (req, res) => {
  const existingContact = await Contact.findFirst({
    where: { id: parseInt(req.params.id), ownerId: req.user.id }
  });

  if (!existingContact) throw new ApiError(404, "Contact not found");

  await Contact.delete({
    where: { id: parseInt(req.params.id) }
  });
  
  await invalidateUserCache(req.user.id);
  res.status(200).json({ success: true, message: "Contact removed" });
});
