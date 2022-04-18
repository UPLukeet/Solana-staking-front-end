import { ReactChild } from "react";
import { LockClosedIcon } from "@heroicons/react/outline";

export const NftGrid = ({
  children,
  heading,
  isStaked,
}: {
  children: ReactChild[];
  heading?: string;
  isStaked?: boolean;
}) => {
  return (
    <div
      className={`flex flex-col relative h-full w-full ${
        isStaked && "opacity-40"
      }`}
    >
      {isStaked && (
        <LockClosedIcon className="absolute m-auto h-1/3 w-1/3 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      )}
      <h2 className="text-center">{heading}</h2>
      <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3 mt-4 p-5">
        {children}
      </ul>
    </div>
  );
};
