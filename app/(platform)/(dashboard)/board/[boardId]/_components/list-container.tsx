"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { toast } from "sonner";

import { ListWithCards } from "@/types";
import { ListForm } from "./list-form";
import { ListItem } from "./list-item";

import { useAction } from "@/hooks/use-action";
import { updateListOrder } from "@/actions/update-list-order";
import { updateCardOrder } from "@/actions/update-card-order";

interface ListContainerProps {
  data: ListWithCards[];
  boardId: string;
}

function reorder<T>(list: T[], startIndex: number, endIndex: number) {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
}

export const ListContainer = ({ data, boardId }: ListContainerProps) => {
  const [orderedData, setOrderedData] = useState(data);

  const { execute: executeUpdateListOrder } = useAction(updateListOrder, {
    onSuccess: (data) => {
      toast.success("List reordered");
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  const { execute: executeUpdateCardOrder } = useAction(updateCardOrder, {
    onSuccess: (data) => {
      toast.success("Card reordered");
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  useEffect(() => {
    setOrderedData(data);
  }, [data]);

  const onDragEnd = (result: any) => {
    const { destination, source, type } = result;

    if (!destination) {
      return;
    }

    //Dropped in the same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Moving list
    if (type === "list") {
      const items = reorder(orderedData, source.index, destination.index).map(
        (item, index) => ({ ...item, order: index })
      );

      setOrderedData(items);
      executeUpdateListOrder({ items, boardId });
    }

    //Moving card
    if (type === "card") {
      let newOrderData = [...orderedData];

      const sourceList = newOrderData.find(
        (list) => list.id === source.droppableId
      );
      const destinationList = newOrderData.find(
        (list) => list.id === destination.droppableId
      );

      if (!sourceList || !destinationList) {
        return;
      }

      //If card exists on sourceList
      if (!sourceList.cards) {
        sourceList.cards = [];
      }

      if (!destinationList.cards) {
        destinationList.cards = [];
      }

      //Moving in the same list
      if (source.droppableId === destination.droppableId) {
        const reorderedCards = reorder(
          sourceList.cards,
          source.index,
          destination.index
        ).map((card, index) => ({ ...card, order: index }));

        sourceList.cards = reorderedCards;

        setOrderedData(newOrderData);

        executeUpdateCardOrder({ items: reorderedCards, boardId });
      } else {
        //Move to another list
        const [movedCard] = sourceList.cards.splice(source.index, 1);
        movedCard.listId = destination.droppableId;
        destinationList.cards.splice(destination.index, 0, movedCard);
        sourceList.cards = sourceList.cards.map((card, index) => ({
          ...card,
          order: index,
        }));

        destinationList.cards.map((card, index) => ({ ...card, order: index }));

        executeUpdateCardOrder({ items: destinationList.cards, boardId });
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="lists" type="list" direction="horizontal">
        {(provided) => (
          <ol
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-x-3 h-full"
          >
            {orderedData.map((list, index) => {
              return <ListItem key={list.id} index={index} data={list} />;
            })}
            {provided.placeholder}
            <ListForm />
            <div className="flex-shrink-0 w-1" />
          </ol>
        )}
      </Droppable>
    </DragDropContext>
  );
};
