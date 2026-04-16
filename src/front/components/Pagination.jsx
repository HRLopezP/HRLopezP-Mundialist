import React from "react";

const Pagination = ({ total, pages, currentPage, onPageChange, perPage, itemsCount }) => {
    if (pages <= 1) return null; 

    return (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mt-4 gap-3">
            <span className="small text-dim">
                Mostrando <span className="text-white fw-bold">{itemsCount}</span> de <span className="text-white fw-bold">{total}</span> usuarios
            </span>
            <nav>
                <ul className="pagination pagination-sm mb-0 custom-pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage - 1)}>
                            <i className="fa-solid fa-chevron-left"></i>
                        </button>
                    </li>
                    {[...Array(pages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => onPageChange(i + 1)}>
                                {i + 1}
                            </button>
                        </li>
                    ))}
                    <li className={`page-item ${currentPage === pages ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => onPageChange(currentPage + 1)}>
                            <i className="fa-solid fa-chevron-right"></i>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default Pagination;