import { createCrudHooks } from '../lib/crud.ts';

// Mirrors the Dtos in LibraryManagementSystem.Server.

export interface Author {
    id: string;
    name: string;
}
export interface AuthorRequest {
    name: string;
}

export interface Genre {
    id: string;
    name: string;
    description: string | null;
}
export interface GenreRequest {
    name: string;
    description: string | null;
}

export interface Language {
    id: string;
    name: string;
    code: string | null;
}
export interface LanguageRequest {
    name: string;
    code: string | null;
}

/** Numeric values match the server's BookStatus enum (serialised as numbers by default). */
export const BookStatus = {
    Available: 0,
    Borrowed: 1,
    Reserved: 2,
    Lost: 3,
    Damaged: 4,
} as const;
export type BookStatus = (typeof BookStatus)[keyof typeof BookStatus];

export const bookStatusLabels: Record<BookStatus, string> = {
    [BookStatus.Available]: 'Available',
    [BookStatus.Borrowed]: 'Borrowed',
    [BookStatus.Reserved]: 'Reserved',
    [BookStatus.Lost]: 'Lost',
    [BookStatus.Damaged]: 'Damaged',
};

export interface Floor {
    id: string;
    name: string;
}
export interface FloorRequest {
    name: string;
}

/** How a shelf is turned on the 3D map, in degrees. The server only accepts these two. */
export type ShelfRotation = 90 | 180;
export const shelfRotations: readonly ShelfRotation[] = [90, 180];

export interface Shelf {
    id: string;
    name: string;
    floorId: string;
    floorName: string;
    rotation: ShelfRotation;
}
export interface ShelfRequest {
    name: string;
    floorId: string;
    rotation: ShelfRotation;
}

export interface Row {
    id: string;
    name: string;
    shelfId: string;
    shelfName: string;
    floorId: string;
    floorName: string;
}
export interface RowRequest {
    name: string;
    shelfId: string;
}

export interface Section {
    id: string;
    name: string;
    floorId: string;
    floorName: string;
    shelfId: string;
    shelfName: string;
}
export interface SectionRequest {
    name: string;
    floorId: string;
    shelfId: string;
}

/** "Floor 1 › Shelf A › Row 3" */
export const rowLabel = (row: Row) => `${row.floorName} › ${row.shelfName} › ${row.name}`;

export interface Book {
    id: string;
    title: string;
    isbn: string;
    edition: string | null;
    pages: number;
    status: BookStatus;
    dateAcquired: string; // yyyy-MM-dd
    genreId: string;
    genreName: string;
    authors: Author[];
    languages: Language[];
    rows: Row[];
}
export interface BookRequest {
    title: string;
    isbn: string;
    edition: string | null;
    pages: number;
    status: BookStatus;
    dateAcquired: string;
    genreId: string;
    authorIds: string[];
    languageIds: string[];
    rowIds: string[];
}

export const bookHooks = createCrudHooks<Book, BookRequest>('books');
export const authorHooks = createCrudHooks<Author, AuthorRequest>('authors');
export const genreHooks = createCrudHooks<Genre, GenreRequest>('genres');
export const languageHooks = createCrudHooks<Language, LanguageRequest>('languages');
export const floorHooks = createCrudHooks<Floor, FloorRequest>('floors');
export const shelfHooks = createCrudHooks<Shelf, ShelfRequest>('shelves');
export const rowHooks = createCrudHooks<Row, RowRequest>('rows');
export const sectionHooks = createCrudHooks<Section, SectionRequest>('sections');
