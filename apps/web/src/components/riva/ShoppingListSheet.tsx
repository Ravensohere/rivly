import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, Trash2, ShoppingCart } from 'lucide-react';
import type { ShoppingItem } from '@/hooks/useShoppingList';

interface Props {
  open: boolean;
  onClose: () => void;
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearChecked: () => void;
}

export function ShoppingListSheet({ open, onClose, items, onToggle, onRemove, onClearChecked }: Props) {
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  const checkedCount = items.filter(i => i.checked).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            Shopping List ({items.length} items)
            {checkedCount > 0 && (
              <Button size="sm" variant="ghost" onClick={onClearChecked} className="ml-auto text-xs">
                Clear {checkedCount} checked
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto pt-4 pb-8 space-y-4">
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</h3>
              <ul className="space-y-1">
                {categoryItems.map(item => (
                  <li key={item.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50">
                    <button onClick={() => onToggle(item.id)} className="flex-shrink-0">
                      {item.checked
                        ? <Check className="w-4 h-4 text-primary" />
                        : <div className="w-4 h-4 rounded border border-muted-foreground/40" />
                      }
                    </button>
                    <span className={`flex-1 text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                      {item.text}
                    </span>
                    <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground text-sm pt-8">
              Your shopping list is empty. Say "Add milk to shopping list" to get started!
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
