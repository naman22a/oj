import React from 'react';
import type { ExtendedProblem } from '../interfaces';

interface Props {
    problem: ExtendedProblem;
}

const Right: React.FC<Props> = () => {
    return (
        <div className="w-full overflow-y-scroll md:w-1/2 p-5">
            <h1>Right</h1>
        </div>
    );
};

export default Right;
