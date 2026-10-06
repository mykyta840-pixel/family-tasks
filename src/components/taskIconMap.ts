import {
  Apple, Backpack, Bath, Bike, BedDouble, BookOpen, Calculator, Car, Cat, CookingPot, Dog, Droplets, Dumbbell,
  Flower2, Footprints, GraduationCap, HeartHandshake, Languages, ListChecks, Music, NotebookPen, Palette, PawPrint,
  Recycle, ShoppingBasket, ShowerHead, Shirt, Sofa, SprayCan, Sparkles, Sprout, Trash2, Utensils, WashingMachine, Wind,
  type LucideIcon,
} from 'lucide-react'
import type { TaskIconKey } from '../lib/taskIconKeys'

// Record по всем ключам: TypeScript не даст забыть иконку для нового ключа
export const ICON_COMPONENT: Record<TaskIconKey, LucideIcon> = {
  clean: Sparkles, dishes: Utensils, trash: Trash2, laundry: WashingMachine, clothes: Shirt, bed: BedDouble, room: Sofa,
  air: Wind, wipe: SprayCan, cook: CookingPot, recycle: Recycle,
  school: GraduationCap, homework: NotebookPen, reading: BookOpen, bag: Backpack, math: Calculator, language: Languages,
  art: Palette, music: Music,
  sport: Dumbbell, bike: Bike, walk: Footprints,
  pets: PawPrint, dog: Dog, cat: Cat, plants: Flower2, garden: Sprout,
  hygiene: Bath, shower: ShowerHead, wash: Droplets,
  shopping: ShoppingBasket, help: HeartHandshake, car: Car, food: Apple,
  general: ListChecks,
}
